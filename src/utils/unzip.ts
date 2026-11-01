/**
 * Zero-dependency ZIP extractor for modern browsers and Node.js.
 * Utilizes the standard DecompressionStream API for deflate-raw decompression.
 */

async function decompressDeflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressed as any);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

/**
 * Extracts all files from a ZIP archive buffer (.docx, .xlsx, .pptx, .zip).
 * Returns a Map of file paths to their uncompressed Uint8Array bytes.
 */
export async function unzip(zipBuffer: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength);
  const files = new Map<string, Uint8Array>();

  // Locate End of Central Directory Record (EOCD: 0x06054b50)
  let eocdOffset = -1;
  const minScan = Math.max(0, zipBuffer.byteLength - 65557);
  for (let i = zipBuffer.byteLength - 22; i >= minScan; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid archive: End of Central Directory signature not found.');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let pos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > zipBuffer.byteLength || view.getUint32(pos, true) !== 0x02014b50) {
      break;
    }

    const compression = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const nameBytes = new Uint8Array(zipBuffer.buffer, zipBuffer.byteOffset + pos + 46, nameLen);
    const fileName = new TextDecoder('utf-8').decode(nameBytes);

    // Read payload from local file header
    if (localHeaderOffset + 30 <= zipBuffer.byteLength) {
      const lhView = new DataView(zipBuffer.buffer, zipBuffer.byteOffset + localHeaderOffset, 30);
      const lhNameLen = lhView.getUint16(26, true);
      const lhExtraLen = lhView.getUint16(28, true);
      const dataOffset = localHeaderOffset + 30 + lhNameLen + lhExtraLen;

      if (dataOffset + compressedSize <= zipBuffer.byteLength) {
        const dataSlice = new Uint8Array(zipBuffer.buffer, zipBuffer.byteOffset + dataOffset, compressedSize);

        if (compression === 0) {
          // Stored (uncompressed)
          files.set(fileName, new Uint8Array(dataSlice));
        } else if (compression === 8) {
          // Deflated
          try {
            const decompressed = await decompressDeflateRaw(dataSlice);
            files.set(fileName, decompressed);
          } catch (err) {
            console.warn(`Failed to decompress ${fileName}:`, err);
          }
        }
      }
    }

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return files;
}
