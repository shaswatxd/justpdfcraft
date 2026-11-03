import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';

async function testPdfEngines() {
  console.log('🧪 Starting PDF Engine Verification Tests...\n');

  // 1. Create a dummy test PDF 1
  const doc1 = await PDFDocument.create();
  const page1 = doc1.addPage([400, 600]);
  page1.drawText('Document 1 - Page 1', { x: 50, y: 500 });
  const bytes1 = await doc1.save();
  console.log('✓ Created Test PDF 1 (1 page, size:', bytes1.length, 'bytes)');

  // 2. Create a dummy test PDF 2
  const doc2 = await PDFDocument.create();
  const page2 = doc2.addPage([400, 600]);
  page2.drawText('Document 2 - Page 1', { x: 50, y: 500 });
  const page3 = doc2.addPage([400, 600]);
  page3.drawText('Document 2 - Page 2', { x: 50, y: 500 });
  const bytes2 = await doc2.save();
  console.log('✓ Created Test PDF 2 (2 pages, size:', bytes2.length, 'bytes)');

  // 3. Test Merge
  const mergedDoc = await PDFDocument.create();
  const loaded1 = await PDFDocument.load(bytes1);
  const loaded2 = await PDFDocument.load(bytes2);
  const pagesFrom1 = await mergedDoc.copyPages(loaded1, loaded1.getPageIndices());
  const pagesFrom2 = await mergedDoc.copyPages(loaded2, loaded2.getPageIndices());
  pagesFrom1.forEach(p => mergedDoc.addPage(p));
  pagesFrom2.forEach(p => mergedDoc.addPage(p));
  const mergedBytes = await mergedDoc.save();
  console.log('✓ Merged Document Result: 3 total pages, size:', mergedBytes.length, 'bytes');
  if (mergedDoc.getPageCount() !== 3) throw new Error('Merge test failed');

  // 4. Test Split (Extract page 2)
  const splitDoc = await PDFDocument.create();
  const [extractedPage] = await splitDoc.copyPages(mergedDoc, [1]);
  splitDoc.addPage(extractedPage);
  const splitBytes = await splitDoc.save();
  console.log('✓ Split Document Result: 1 extracted page, size:', splitBytes.length, 'bytes');
  if (splitDoc.getPageCount() !== 1) throw new Error('Split test failed');

  // 5. Test Rotate
  const rotateDoc = await PDFDocument.load(mergedBytes);
  rotateDoc.getPages()[0].setRotation(degrees(90));
  const rotatedBytes = await rotateDoc.save();
  const reloadedRotated = await PDFDocument.load(rotatedBytes);
  if (reloadedRotated.getPages()[0].getRotation().angle !== 90) throw new Error('Rotate test failed');
  console.log('✓ Rotate Document Result: Page 1 angle rotated to 90 degrees');

  // 6. Test Watermark
  const watermarkDoc = await PDFDocument.load(mergedBytes);
  watermarkDoc.getPages().forEach(p => {
    p.drawText('TEST WATERMARK', { x: 50, y: 300, size: 24, color: rgb(0.9, 0.2, 0.2), opacity: 0.5 });
  });
  const watermarkedBytes = await watermarkDoc.save();
  console.log('✓ Watermark Result: Text stamped across pages, size:', watermarkedBytes.length, 'bytes');

  // 7. Test Protect (AES-256) & Unlock
  const password = 'ilovepdf_secret_123';
  const encryptedBytes = await encryptPDF(mergedBytes, password, { algorithm: 'AES-256' });
  console.log('✓ Encrypted PDF with AES-256, size:', encryptedBytes.length, 'bytes');

  const encStatus = await isEncrypted(encryptedBytes);
  console.log('✓ Verification of encryption status:', encStatus.encrypted ? 'LOCKED (AES-256)' : 'UNLOCKED');
  if (!encStatus.encrypted) throw new Error('Encryption check failed');

  // Decrypt with correct password
  const decryptedBytes = await decryptPDF(encryptedBytes, password);
  const decryptedDoc = await PDFDocument.load(decryptedBytes);
  console.log('✓ Decrypted PDF successfully! Page count:', decryptedDoc.getPageCount());
  if (decryptedDoc.getPageCount() !== 3) throw new Error('Decryption test failed');

  console.log('\n🎉 ALL 7 ENGINE INTEGRATION TESTS PASSED PERFECTLY!\n');
}

testPdfEngines().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
