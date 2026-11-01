import { PDFDocument } from 'pdf-lib';

export interface RepairResult {
  success: boolean;
  pageCount: number;
  originalBytes: number;
  repairedBytes: number;
  data?: Uint8Array;
  error?: string;
}

/**
 * Client-side PDF Repair and Stream Recovery Engine.
 * Reconstructs cross-reference (xref) tables, strips orphaned objects,
 * repairs displaced headers, and regenerates a clean, valid PDF file.
 */
export async function repairPdf(sourceBytes: Uint8Array): Promise<RepairResult> {
  const originalBytes = sourceBytes.byteLength;
  let bytesToTry = sourceBytes;

  // 1. Check for displaced header (e.g. leading whitespace or HTTP garbage)
  const magic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
  let headerIndex = -1;
  for (let i = 0; i < Math.min(bytesToTry.length - 5, 2048); i++) {
    if (
      bytesToTry[i] === magic[0] &&
      bytesToTry[i + 1] === magic[1] &&
      bytesToTry[i + 2] === magic[2] &&
      bytesToTry[i + 3] === magic[3] &&
      bytesToTry[i + 4] === magic[4]
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex > 0) {
    bytesToTry = bytesToTry.slice(headerIndex);
  }

  // 2. Check for missing %%EOF trailer
  const eofBytes = new TextEncoder().encode('\n%%EOF\n');
  const tail = new TextDecoder('latin1').decode(bytesToTry.slice(-64));
  if (!tail.includes('%%EOF')) {
    const patched = new Uint8Array(bytesToTry.length + eofBytes.length);
    patched.set(bytesToTry, 0);
    patched.set(eofBytes, bytesToTry.length);
    bytesToTry = patched;
  }

  // 3. Attempt repair and re-index via pdf-lib
  try {
    const doc = await PDFDocument.load(bytesToTry, {
      ignoreEncryption: true,
      parseSpeed: Infinity,
      updateMetadata: false,
    });

    const pageCount = doc.getPageCount();
    if (pageCount === 0) {
      throw new Error('No valid pages could be parsed from the document structure.');
    }

    // Save with clean xref table and normalized object structure
    const repairedData = await doc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });

    return {
      success: true,
      pageCount,
      originalBytes,
      repairedBytes: repairedData.byteLength,
      data: repairedData,
    };
  } catch (err: any) {
    return {
      success: false,
      pageCount: 0,
      originalBytes,
      repairedBytes: 0,
      error: err?.message || 'Could not reconstruct valid PDF streams from corrupted file.',
    };
  }
}
