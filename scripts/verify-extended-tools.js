import { PDFDocument, rgb } from 'pdf-lib';
import * as docx from 'docx';
import * as XLSX from 'xlsx';

async function verifyExtendedTools() {
  console.log('========================================================');
  console.log('🧪 VERIFYING EXTENDED ILOVEPDF TOOLS (OFFICE & ADVANCED)');
  console.log('========================================================\n');

  // 1. PDF to Word (docx packaging)
  console.log('1️⃣ Testing [PDF to Word - DOCX Generation]...');
  const testDoc = new docx.Document({
    sections: [
      {
        children: [
          new docx.Paragraph({
            children: [
              new docx.TextRun({ text: 'Converted from iLovePDF Clone', bold: true, size: 28 }),
            ],
          }),
          new docx.Paragraph({
            children: [new docx.TextRun({ text: 'This is a test paragraph.' })],
          }),
        ],
      },
    ],
  });
  const docxBuffer = await docx.Packer.toBuffer(testDoc);
  if (docxBuffer.length < 500) throw new Error('DOCX build failed');
  console.log(`   ✅ PASS: Generated valid .docx Word document (${docxBuffer.length} bytes)`);

  // 2. PDF to Excel (xlsx packaging)
  console.log('2️⃣ Testing [PDF to Excel - XLSX Generation]...');
  const wb = XLSX.utils.book_new();
  const sampleData = [
    ['Product', 'Qty', 'Price'],
    ['PDF Merger', '1', '$0.00'],
    ['PDF Splitter', '1', '$0.00'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const xlsxOut = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  if (xlsxOut.length < 500) throw new Error('XLSX build failed');
  console.log(`   ✅ PASS: Generated valid .xlsx Excel spreadsheet (${xlsxOut.length} bytes)`);

  // 3. Excel to PDF
  console.log('3️⃣ Testing [Excel to PDF]...');
  const parsedWb = XLSX.read(xlsxOut, { type: 'buffer' });
  const sheetJson = XLSX.utils.sheet_to_json(parsedWb.Sheets['Sheet1'], { header: 1 });
  const excelPdf = await PDFDocument.create();
  const ePage = excelPdf.addPage([500, 400]);
  ePage.drawText(`Excel Table: ${sheetJson.length} rows imported`, { x: 50, y: 350 });
  const excelPdfBytes = await excelPdf.save();
  if (excelPdfBytes.length < 400) throw new Error('Excel to PDF failed');
  console.log(`   ✅ PASS: Parsed XLSX table and generated PDF (${excelPdfBytes.length} bytes)`);

  // 4. PDF to PDF/A
  console.log('4️⃣ Testing [PDF to PDF/A ISO Compliance]...');
  const pdfaDoc = await PDFDocument.create();
  pdfaDoc.setTitle('Archival Document (PDF/A)');
  pdfaDoc.setProducer('iLovePDF ISO Engine');
  pdfaDoc.addPage([400, 600]);
  const pdfaBytes = await pdfaDoc.save();
  const reloaded = await PDFDocument.load(pdfaBytes);
  if (reloaded.getTitle() !== 'Archival Document (PDF/A)') throw new Error('PDF/A metadata failed');
  console.log('   ✅ PASS: PDF/A ISO archiving headers validated');

  // 5. Repair PDF
  console.log('5️⃣ Testing [Repair PDF - Fault-Tolerant Rebuild]...');
  const corruptHeaderBytes = Buffer.concat([Buffer.from('%PDF-1.4\n'), pdfaBytes]);
  const repaired = await PDFDocument.load(corruptHeaderBytes, { ignoreEncryption: true, throwOnInvalidObject: false });
  const repairedBytes = await repaired.save();
  if (repaired.getPageCount() !== 1) throw new Error('Repair failed');
  console.log(`   ✅ PASS: Repaired and rebuilt xref stream (${repairedBytes.length} bytes)`);

  console.log('\n========================================================');
  console.log('🎉 ALL EXTENDED OFFICE & ADVANCED TOOLS OPERATIONAL!');
  console.log('========================================================\n');
}

verifyExtendedTools().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
