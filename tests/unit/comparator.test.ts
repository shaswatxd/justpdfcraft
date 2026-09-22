import { describe, it, expect } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { DocumentComparator } from '../../core/compare/comparator';
import { PDFDocument } from 'pdf-lib';

describe('DocumentComparator', () => {
  it('should detect differences between two documents', async () => {
    const engine = new FallbackPDFEngine();

    // Doc A (2 pages)
    const docA = await PDFDocument.create();
    docA.addPage([500, 500]);
    docA.addPage([500, 500]);
    const bytesA = await docA.save();

    // Doc B (3 pages - added 1 page)
    const docB = await PDFDocument.create();
    docB.addPage([500, 500]);
    docB.addPage([500, 500]);
    docB.addPage([500, 500]);
    const bytesB = await docB.save();

    const { documentId: docAId } = await engine.openDocument(bytesA);
    const { documentId: docBId } = await engine.openDocument(bytesB);

    const comparator = new DocumentComparator(engine);
    const diff = await comparator.compareDocuments(docAId, docBId, 'Original', 'Modified');

    expect(diff.pageCountA).toBe(2);
    expect(diff.pageCountB).toBe(3);
    expect(diff.pagesWithDifferences).toBeGreaterThanOrEqual(1);
    expect(diff.pageResults[2].textChanges.added[0]).toContain('Entire page added');
  });
});
