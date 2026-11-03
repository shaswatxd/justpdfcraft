import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';
import { UploadedFile, ProcessResult, UnlockOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

export async function unlockPdf(
  fileItem: UploadedFile,
  options: UnlockOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Checking document security...', 20);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);

  const status = await isEncrypted(pdfBytes);
  if (!status.encrypted) {
    onProgress?.('Document is not password encrypted. Clean copy ready!', 100);
    const blob = createPdfBlob(pdfBytes);
    return {
      blob,
      fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_unlocked.pdf`,
      downloadUrl: URL.createObjectURL(blob),
      originalSize: fileItem.size,
      newSize: blob.size,
    };
  }

  const password = options.password || '';
  onProgress?.('Decrypting document...', 60);

  try {
    const decryptedBytes = await decryptPDF(pdfBytes, password);
    onProgress?.('Decryption successful!', 90);
    const blob = createPdfBlob(decryptedBytes);
    const downloadUrl = URL.createObjectURL(blob);

    onProgress?.('Complete!', 100);

    return {
      blob,
      fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_unlocked.pdf`,
      downloadUrl,
      originalSize: fileItem.size,
      newSize: blob.size,
    };
  } catch (err: any) {
    throw new Error('Incorrect password or unable to decrypt this document.');
  }
}
