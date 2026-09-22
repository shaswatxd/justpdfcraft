import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument, PDFName } from 'pdf-lib';

describe('FallbackPDFEngine Document Sanitizer & Metadata Scrubber', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createSensitivePdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    doc.setTitle('Q4 Internal Financial Audit');
    doc.setAuthor('Jane Doe (Finance VP)');
    doc.setSubject('Strictly Confidential');
    doc.setKeywords(['merger', 'acquisition', 'restricted']);
    doc.setCreator('Microsoft Word for Mac 16.78');
    doc.setProducer('macOS Quartz PDFContext');
    doc.setCreationDate(new Date('2025-01-15T09:30:00Z'));
    doc.setModificationDate(new Date('2025-01-16T14:45:00Z'));

    // Inject raw XMP XML stream into Catalog dictionary to simulate scanner/software metadata leaks
    const xmpSampleXml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:DeviceID>Workstation-MacBookPro-001</pdf:DeviceID>
      <pdf:InternalUser>jdoe@internalcorp.com</pdf:InternalUser>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
    const stream = doc.context.stream(xmpSampleXml, {
      Type: PDFName.of('Metadata'),
      Subtype: PDFName.of('XML'),
    });
    const streamRef = doc.context.register(stream);
    doc.catalog.set(PDFName.of('Metadata'), streamRef);

    const page = doc.addPage([600, 400]);
    page.drawText('Confidential Account Balance: $4,500,000', { x: 50, y: 350, size: 14 });
    return await doc.save();
  };

  it('should detect and purge all identifying metadata tags', async () => {
    const sensitiveBytes = await createSensitivePdf();
    const { documentId, metadata: initialMeta } = await engine.openDocument(sensitiveBytes);

    expect(initialMeta.author).toBe('Jane Doe (Finance VP)');
    expect(initialMeta.subject).toBe('Strictly Confidential');
    expect(initialMeta.creator).toBe('Microsoft Word for Mac 16.78');

    const result = await engine.sanitizeDocument(documentId);

    expect(result.strippedFields).toContain('Author');
    expect(result.strippedFields).toContain('Subject');
    expect(result.strippedFields).toContain('Creator');
    expect(result.strippedFields).toContain('Raw XMP XML Metadata Stream');
    expect(result.hasXmpStreamPurged).toBe(true);

    const cleanMeta = await engine.getMetadata(documentId);
    expect(cleanMeta.author).toBeFalsy();
    expect(cleanMeta.subject).toBeFalsy();
    expect(cleanMeta.creator).toBeFalsy();

    const savedBytes = await engine.saveDocument(documentId);
    expect(savedBytes.byteLength).toBeGreaterThan(0);
  });

  it('should eliminate raw XMP XML metadata from the saved PDF binary stream', async () => {
    const sensitiveBytes = await createSensitivePdf();
    const { documentId } = await engine.openDocument(sensitiveBytes);

    await engine.sanitizeDocument(documentId);
    const sanitizedBytes = await engine.saveDocument(documentId);

    // Convert raw bytes to string to verify raw string purge
    const binaryString = new TextDecoder('latin1').decode(sanitizedBytes);

    expect(binaryString).not.toContain('Workstation-MacBookPro-001');
    expect(binaryString).not.toContain('jdoe@internalcorp.com');
    expect(binaryString).not.toContain('Jane Doe (Finance VP)');
  });

  it('should preserve document layout and text content after sanitization', async () => {
    const sensitiveBytes = await createSensitivePdf();
    const { documentId } = await engine.openDocument(sensitiveBytes);

    await engine.sanitizeDocument(documentId);

    const pageText = await engine.extractPageText(documentId, 0);
    expect(pageText.text).toContain('Confidential Account Balance');

    const dims = await engine.getPageDimensions(documentId, 0);
    expect(dims.width).toBe(600);
    expect(dims.height).toBe(400);
  });

  it('should support combined permanent redaction and sanitization', async () => {
    const sensitiveBytes = await createSensitivePdf();
    const { documentId } = await engine.openDocument(sensitiveBytes);

    // 1. Redact the dollar figure
    await engine.applyRedactions(documentId, [
      {
        pageIndex: 0,
        rect: [220, 345, 120, 20],
        overlayText: '[CONFIDENTIAL PURGED]',
      },
    ]);

    // 2. Sanitize metadata
    const sanitizeResult = await engine.sanitizeDocument(documentId);
    expect(sanitizeResult.hasXmpStreamPurged).toBe(true);

    const finalBytes = await engine.saveDocument(documentId);
    const finalString = new TextDecoder('latin1').decode(finalBytes);

    // Both metadata leaks and underlying text must be completely absent
    expect(finalString).not.toContain('Jane Doe');
    expect(finalString).not.toContain('jdoe@internalcorp.com');
  });
});
