const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const PORT = 1420;
const BASE_URL = `http://localhost:${PORT}/`;

function isServerListening(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerListening(port)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    console.log('   Chromium default launch fallback to msedge:', err.message);
    return await chromium.launch({ channel: 'msedge', headless: true });
  }
}

async function createSamplePdfBytes() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`Playwright Test Document - Page ${i}`, {
      x: 50,
      y: 800,
      size: 20,
      font,
      color: rgb(0.1, 0.2, 0.8),
    });
    page.drawText('Sample tabular content for testing table extractor:', {
      x: 50,
      y: 750,
      size: 14,
      font,
    });
    page.drawText('ID    Description       Amount', { x: 50, y: 720, size: 12, font });
    page.drawText('001   Tuition Fee       $1200', { x: 50, y: 700, size: 12, font });
    page.drawText('002   Lab Charges       $300', { x: 50, y: 680, size: 12, font });
  }
  return Array.from(await doc.save());
}

async function runFullSuiteAudit() {
  console.log('🚀 Starting JustPDFCraft Exhaustive Playwright Tools Audit...');
  let serverProcess = null;

  const alreadyRunning = await isServerListening(PORT);
  if (!alreadyRunning) {
    console.log(`📡 Starting local Vite server on port ${PORT}...`);
    const isWin = process.platform === 'win32';
    serverProcess = spawn(
      isWin ? 'npx.cmd' : 'npx',
      ['vite', 'preview', '--port', String(PORT), '--strictPort'],
      {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
        shell: true,
      }
    );

    const ready = await waitForServer(PORT, 25);
    if (!ready) {
      console.error('❌ Failed to start Vite preview server on port', PORT);
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
    console.log('✅ Local server is ready!');
  } else {
    console.log(`✅ Using existing server on port ${PORT}`);
  }

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const auditReport = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    console.error('❌ [PageError]:', err.message);
    pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404')) {
        console.warn('⚠️ [ConsoleError]:', text);
        consoleErrors.push(text);
      }
    }
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 1. Load active document into document store
    console.log('\n📄 STEP 1: Creating & Loading Test Document...');
    const pdfBytes = await createSamplePdfBytes();
    await page.evaluate(async (bytes) => {
      await window.__JUSTPDFCRAFT_DOC_STORE__.getState().loadDocument(new Uint8Array(bytes), 'PlaywrightTestDoc.pdf');
    }, pdfBytes);
    await page.waitForTimeout(600);

    // 2. Test Watermark Tool Execution
    console.log('\n💧 STEP 2: Testing Watermark Tool Action...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('watermark');
      });
      await page.waitForTimeout(400);

      // Click Apply Watermark button
      const applied = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Apply Watermark'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(600);
      console.log(`   Watermark apply clicked: ${applied}`);
      auditReport.push({ tool: 'Watermark', status: applied ? 'PASS' : 'FAIL', details: 'Apply action' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Watermark error:', err.message);
      auditReport.push({ tool: 'Watermark', status: 'ERROR', details: err.message });
    }

    // 3. Test Bates Numbering Action
    console.log('\n🔢 STEP 3: Testing Bates Numbering Action...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('bates');
      });
      await page.waitForTimeout(400);

      const batesApplied = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Apply Bates') || b.innerText.includes('Apply Numbers'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(600);
      console.log(`   Bates apply clicked: ${batesApplied}`);
      auditReport.push({ tool: 'Bates Numbering', status: batesApplied ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Bates error:', err.message);
      auditReport.push({ tool: 'Bates Numbering', status: 'ERROR', details: err.message });
    }

    // 4. Test Compress Action
    console.log('\n🗜️ STEP 4: Testing PDF Compression Action...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('compress');
      });
      await page.waitForTimeout(400);

      const compressApplied = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Start Compression') || b.innerText.includes('Compress PDF'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(1000);
      const compressResult = await page.evaluate(() => {
        return document.body.innerText.includes('Compression Complete') || document.body.innerText.includes('Saved') || document.body.innerText.includes('Download');
      });
      console.log(`   Compress PDF executed: ${compressApplied}, result: ${compressResult}`);
      auditReport.push({ tool: 'Compress', status: compressResult ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Compress error:', err.message);
      auditReport.push({ tool: 'Compress', status: 'ERROR', details: err.message });
    }

    // 5. Test Sanitize Action
    console.log('\n🛡️ STEP 5: Testing PDF Sanitize & Metadata Stripper Action...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('sanitize');
      });
      await page.waitForTimeout(400);

      const sanitizeApplied = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Sanitize & Clean') || b.innerText.includes('Sanitize Document'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(800);
      const sanitizeResult = await page.evaluate(() => {
        return document.body.innerText.includes('stripped') || document.body.innerText.includes('Re-Sanitize') || document.body.innerText.includes('Done');
      });
      console.log(`   Sanitize PDF executed: ${sanitizeApplied}, result: ${sanitizeResult}`);
      auditReport.push({ tool: 'Sanitize', status: sanitizeResult ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Sanitize error:', err.message);
      auditReport.push({ tool: 'Sanitize', status: 'ERROR', details: err.message });
    }

    // 6. Test Split Action
    console.log('\n✂️ STEP 6: Testing PDF Split Action...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('split');
      });
      await page.waitForTimeout(400);

      const splitApplied = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Split & Download'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(800);
      console.log(`   Split PDF executed: ${splitApplied}`);
      auditReport.push({ tool: 'Split', status: splitApplied ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Split error:', err.message);
      auditReport.push({ tool: 'Split', status: 'ERROR', details: err.message });
    }

    // 7. Test Table Extractor Action
    console.log('\n📊 STEP 7: Testing PDF Table Extractor...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('extract-table');
      });
      await page.waitForTimeout(1000);

      const tableDataRendered = await page.evaluate(() => {
        return !!document.querySelector('table') || document.body.innerText.includes('Detected:') || document.body.innerText.includes('Copy for Excel');
      });
      console.log(`   Table extracted and previewed: ${tableDataRendered}`);
      auditReport.push({ tool: 'Table Extractor', status: tableDataRendered ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Table extractor error:', err.message);
      auditReport.push({ tool: 'Table Extractor', status: 'ERROR', details: err.message });
    }

    // 8. Test Convert Dialog (PDF to Images & PDF to Text)
    console.log('\n🔄 STEP 8: Testing Convert Dialog...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('convert');
      });
      await page.waitForTimeout(400);

      const convertButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const exportImg = btns.some(b => b.innerText.includes('Export Image'));
        return { exportImg };
      });
      console.log(`   Convert dialog rendered with export: ${convertButtons.exportImg}`);
      auditReport.push({ tool: 'Convert (PDF to Images)', status: convertButtons.exportImg ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Convert error:', err.message);
      auditReport.push({ tool: 'Convert', status: 'ERROR', details: err.message });
    }

    // 9. Test Crop Dialog Action
    console.log('\n📐 STEP 9: Testing Crop Dialog Action...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('crop');
      });
      await page.waitForTimeout(400);

      const cropApplied = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Apply Crop') || b.innerText.includes('Crop Page'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(600);
      console.log(`   Crop apply clicked: ${cropApplied}`);
      auditReport.push({ tool: 'Crop', status: cropApplied ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Crop error:', err.message);
      auditReport.push({ tool: 'Crop', status: 'ERROR', details: err.message });
    }

    // 10. Test Sign Dialog Action
    console.log('\n✍️ STEP 10: Testing Sign Dialog Action (Type Signature)...');
    try {
      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('sign');
      });
      await page.waitForTimeout(400);

      // Switch to Type tab and type signature
      const signApplied = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const typeTabBtn = btns.find(b => b.innerText.includes('Type') || b.innerText.includes('Type Signature'));
        if (typeTabBtn) typeTabBtn.click();
        
        await new Promise(r => setTimeout(r, 200));
        const input = document.querySelector('input[placeholder*="Type full name"], input[placeholder*="signature"]');
        if (input) {
          input.value = 'John Doe';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 200));
        const applyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Stamp Signature') || b.innerText.includes('Place Signature') || b.innerText.includes('Apply Signature'));
        if (applyBtn) {
          applyBtn.click();
          return true;
        }
        return false;
      });
      await page.waitForTimeout(800);
      console.log(`   Sign PDF executed: ${signApplied}`);
      auditReport.push({ tool: 'Digital / Type Signature', status: signApplied ? 'PASS' : 'FAIL' });
      await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    } catch (err) {
      console.error('Sign error:', err.message);
      auditReport.push({ tool: 'Sign', status: 'ERROR', details: err.message });
    }

    // 11. Test Student Calculators Full Workflows
    console.log('\n🎓 STEP 11: Testing Student Calculators Full Workflows...');
    const calcs = ['cgpa', 'attendance', 'qr', 'age', 'word', 'grade', 'financial'];
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('student-calculators');
    });
    for (const c of calcs) {
      await page.evaluate((tab) => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveStudentTab(tab);
      }, c);
      await page.waitForTimeout(300);
      const isOk = await page.evaluate(() => {
        return !document.body.innerText.includes('Something went wrong') && !document.querySelector('[role="alert"]');
      });
      auditReport.push({ tool: `Student Calculator: ${c}`, status: isOk ? 'PASS' : 'FAIL' });
    }
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 12. Test Student Tools Full Workflows
    console.log('\n📷 STEP 12: Testing Student Exam Tools Workflows...');
    const studentTools = ['resizer', 'photo-combiner', 'signature-cleaner', 'dop-banner'];
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('student-resizer');
    });
    for (const st of studentTools) {
      await page.evaluate((tab) => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveStudentTab(tab);
      }, st);
      await page.waitForTimeout(300);
      const isOk = await page.evaluate(() => {
        return !document.body.innerText.includes('Something went wrong');
      });
      auditReport.push({ tool: `Student Exam Tool: ${st}`, status: isOk ? 'PASS' : 'FAIL' });
    }
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 13. Test Handwriting Generator
    console.log('\n📝 STEP 13: Testing Handwriting Generator...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('handwriting');
    });
    await page.waitForTimeout(500);
    const hwCanvas = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return canvases.length > 0;
    });
    auditReport.push({ tool: 'Handwriting Generator', status: hwCanvas ? 'PASS' : 'FAIL' });
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 14. Test Photo Editor & Studio
    console.log('\n🖼️ STEP 14: Testing Photo Editor Studio...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('photo-editor');
    });
    await page.waitForTimeout(400);
    const photoEditorOk = await page.evaluate(() => {
      return document.body.innerText.includes('Photo & Document Image Studio') || document.body.innerText.includes('Upload Photo');
    });
    auditReport.push({ tool: 'Photo Editor Studio', status: photoEditorOk ? 'PASS' : 'FAIL' });
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 15. Test Image Tools (Format Converter & Bulk Compress)
    console.log('\n📦 STEP 15: Testing Image Suite Tools...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('image-tools');
    });
    await page.waitForTimeout(400);
    const imageSuiteOk = await page.evaluate(() => {
      return document.body.innerText.includes('Image Suite') && document.body.innerText.includes('Format');
    });
    auditReport.push({ tool: 'Image Suite Tools', status: imageSuiteOk ? 'PASS' : 'FAIL' });
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 16. Test Batch Operations
    console.log('\n📚 STEP 16: Testing Batch Operations Dialog...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('batch');
    });
    await page.waitForTimeout(400);
    const batchOk = await page.evaluate(() => {
      return document.body.innerText.includes('Batch') && document.body.innerText.includes('Operation');
    });
    auditReport.push({ tool: 'Batch Processing', status: batchOk ? 'PASS' : 'FAIL' });
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    console.log('\n==========================================');
    console.log('🏁 EXHAUSTIVE PLAYWRIGHT TOOLS AUDIT RESULTS');
    console.log('==========================================');
    console.table(auditReport);
    console.log(`Page Errors: ${pageErrors.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log('==========================================\n');

  } finally {
    await browser.close();
    if (serverProcess) {
      console.log('🛑 Shutting down test server...');
      serverProcess.kill();
    }
  }

  process.exit(pageErrors.length > 0 ? 1 : 0);
}

runFullSuiteAudit().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
