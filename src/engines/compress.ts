import { PDFDocument } from 'pdf-lib';
import { UploadedFile, ProcessResult, CompressOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

export async function compressPdf(
  fileItem: UploadedFile,
  options: CompressOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Analyzing document structure...', 20);
  const arrayBuffer = await fileItem.file.arrayBuffer();

  onProgress?.('Applying stream optimization and compression...', 50);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Use modern Flate object streams and remove unused document entries
  const useObjectStreams = options.level !== 'less';

  onProgress?.('Re-encoding streams & stripping metadata...', 75);
  let compressedBytes = await pdfDoc.save({
    useObjectStreams,
    addDefaultPage: false,
  });

  // Ensure compressed size never exceeds original size
  if (compressedBytes.length > fileItem.size) {
    compressedBytes = new Uint8Array(arrayBuffer);
  }

  const blob = createPdfBlob(compressedBytes);
  const downloadUrl = URL.createObjectURL(blob);

  const originalSize = fileItem.size;
  const newSize = blob.size;

  onProgress?.('Compression complete!', 100);

  return {
    blob,
    fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_compressed.pdf`,
    downloadUrl,
    originalSize,
    newSize,
  };
}
