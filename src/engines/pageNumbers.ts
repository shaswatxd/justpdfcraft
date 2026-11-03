import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { UploadedFile, ProcessResult, PageNumberOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

export async function addPageNumbers(
  fileItem: UploadedFile,
  options: PageNumberOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Loading PDF document...', 20);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  onProgress?.('Adding page numbers...', 50);

  pages.forEach((page, index) => {
    onProgress?.(`Numbering page ${index + 1} of ${totalPages}...`, 50 + Math.round((index / totalPages) * 35));
    const pageNum = index + options.startFrom;
    let label = `${pageNum}`;

    if (options.format === 'page_n') {
      label = `Page ${pageNum}`;
    } else if (options.format === 'page_n_of_p') {
      label = `Page ${pageNum} of ${totalPages + options.startFrom - 1}`;
    }

    const { width, height } = page.getSize();
    const fontSize = options.fontSize || 10;
    const margin = options.margin || 25;
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x = width - textWidth - margin;
    let y = margin;

    switch (options.position) {
      case 'bottom-right':
        x = width - textWidth - margin;
        y = margin;
        break;
      case 'bottom-center':
        x = width / 2 - textWidth / 2;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = width - textWidth - margin;
        y = height - margin - fontSize;
        break;
      case 'top-center':
        x = width / 2 - textWidth / 2;
        y = height - margin - fontSize;
        break;
      case 'top-left':
        x = margin;
        y = height - margin - fontSize;
        break;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  onProgress?.('Generating numbered PDF...', 90);
  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const downloadUrl = URL.createObjectURL(blob);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_numbered.pdf`,
    downloadUrl,
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}
