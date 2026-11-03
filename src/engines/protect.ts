import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { UploadedFile, ProcessResult, ProtectOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

export async function protectPdf(
  fileItem: UploadedFile,
  options: ProtectOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  if (!options.password) {
    throw new Error('Please enter a password to protect the PDF.');
  }

  onProgress?.('Reading PDF file...', 20);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);

  onProgress?.('Encrypting document with AES-256 standard...', 60);
  const encryptedBytes = await encryptPDF(pdfBytes, options.password, {
    algorithm: 'AES-256',
    ownerPassword: options.password,
  });

  onProgress?.('Finalizing protected PDF...', 90);
  const blob = createPdfBlob(encryptedBytes);
  const downloadUrl = URL.createObjectURL(blob);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_protected.pdf`,
    downloadUrl,
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}
