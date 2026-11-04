import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as docx from 'docx';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Generating test fixtures in', __dirname);

  // 1. Single page PDF
  const pdf1 = await PDFDocument.create();
  const page1 = pdf1.addPage([595.28, 841.89]);
  const font = await pdf1.embedFont(StandardFonts.HelveticaBold);
  page1.drawText('Sample Document 1 - Single Page', { x: 50, y: 750, size: 20, font, color: rgb(0.1, 0.1, 0.8) });
  page1.drawText('This is a test paragraph for QA auditing.', { x: 50, y: 700, size: 14 });
  const pdf1Bytes = await pdf1.save();
  fs.writeFileSync(path.join(__dirname, 'sample-1page.pdf'), Buffer.from(pdf1Bytes));

  // 2. Three page PDF
  const pdf3 = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const p = pdf3.addPage([595.28, 841.89]);
    p.drawText(`Sample Document 2 - Page ${i} of 3`, { x: 50, y: 750, size: 20, font, color: rgb(0.8, 0.2, 0.2) });
    p.drawText(`Page content number ${i} with sample table data: Item A, Item B, Item C`, { x: 50, y: 700, size: 12 });
  }
  const pdf3Bytes = await pdf3.save();
  fs.writeFileSync(path.join(__dirname, 'sample-3pages.pdf'), Buffer.from(pdf3Bytes));

  // 3. Sample PNG (100x100 1-pixel red image PNG base64)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  fs.writeFileSync(path.join(__dirname, 'sample-image.png'), Buffer.from(pngBase64, 'base64'));

  // 4. Sample text file
  fs.writeFileSync(path.join(__dirname, 'sample.txt'), 'Physics Lab Experiment 1\nObjective: Measure acceleration due to gravity.\nResult: 9.8 m/s^2 confirmed.');

  // 5. Sample Word DOCX
  const doc = new docx.Document({
    sections: [{
      properties: {},
      children: [
        new docx.Paragraph({
          children: [new docx.TextRun({ text: 'Sample Word Document', bold: true, size: 28 })],
        }),
        new docx.Paragraph({
          children: [new docx.TextRun({ text: 'Testing DOCX parsing and conversion engine in JustPDFCraft.' })],
        }),
      ],
    }],
  });
  const docxBuffer = await docx.Packer.toBuffer(doc);
  fs.writeFileSync(path.join(__dirname, 'sample.docx'), docxBuffer);

  // 6. Sample Excel XLSX
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Product ID', 'Product Name', 'Price', 'Stock'],
    ['P001', 'Widget Pro', 29.99, 150],
    ['P002', 'Gadget Ultra', 59.99, 75],
    ['P003', 'Craft Tool', 19.99, 300],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  fs.writeFileSync(path.join(__dirname, 'sample.xlsx'), xlsxBuffer);

  // 7. Sample HTML
  fs.writeFileSync(path.join(__dirname, 'sample.html'), '<!DOCTYPE html><html><head><title>Test Document</title></head><body><h1>Sample Report</h1><p>Testing client-side HTML to PDF engine.</p></body></html>');

  console.log('All test fixtures generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
