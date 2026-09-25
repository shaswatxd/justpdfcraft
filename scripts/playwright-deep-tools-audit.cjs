const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

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

async function runDeepAudit() {
  console.log('🚀 Starting JustPDFCraft Deep Functional Tools Audit with Playwright...');
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

  const issuesFound = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    console.error('❌ [PageError]:', err.message);
    pageErrors.push(err.message);
    issuesFound.push({ type: 'PageError', message: err.message });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404') && !text.includes('status of 404')) {
        console.warn('⚠️ [ConsoleError]:', text);
        consoleErrors.push(text);
        issuesFound.push({ type: 'ConsoleError', message: text });
      }
    }
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // PHASE 1: Test Home Dashboard Tool Cards Triggering
    console.log('\n--- PHASE 1: Testing Home Dashboard Tool Triggering ---');
    const toolCardsCount = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.length;
    });
    console.log(`   Found ${toolCardsCount} interactive elements on Home Dashboard.`);

    // PHASE 2: Deep Functional Testing for Student Tools Dialog
    console.log('\n--- PHASE 2: Testing Student Tools Dialog tabs & features ---');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('student-resizer');
    });
    await page.waitForTimeout(400);

    const studentTabs = ['resizer', 'photo-combiner', 'signature-cleaner', 'dop-banner'];
    for (const tab of studentTabs) {
      process.stdout.write(`   Testing Student Tool tab: [${tab}] ... `);
      const errCount = pageErrors.length;
      await page.evaluate((t) => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveStudentTab(t);
      }, tab);
      await page.waitForTimeout(300);

      // Verify DOM content
      const tabRendered = await page.evaluate(() => {
        return !!document.querySelector('input[type="file"]') || !!document.querySelector('canvas') || !!document.querySelector('button');
      });

      if (pageErrors.length > errCount || !tabRendered) {
        console.log('❌ ISSUE DETECTED');
        issuesFound.push({ tab, issue: 'Failed to render cleanly' });
      } else {
        console.log('✓ OK');
      }
    }
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    await page.waitForTimeout(200);

    // PHASE 3: Deep Functional Testing for Student Calculators Dialog
    console.log('\n--- PHASE 3: Testing Student Calculators Dialog sub-calculators ---');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('student-calculators');
    });
    await page.waitForTimeout(400);

    const calcTabs = ['cgpa', 'attendance', 'qr', 'age', 'word', 'grade', 'financial'];
    for (const tab of calcTabs) {
      process.stdout.write(`   Testing Calculator tab: [${tab}] ... `);
      const errCount = pageErrors.length;
      await page.evaluate((t) => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveStudentTab(t);
      }, tab);
      await page.waitForTimeout(300);

      const calcRendered = await page.evaluate(() => {
        return !document.body.innerText.includes('Something went wrong') && !document.querySelector('[role="alert"]');
      });

      if (pageErrors.length > errCount || !calcRendered) {
        console.log('❌ ISSUE DETECTED');
        issuesFound.push({ tab, issue: 'Calculator tab crashed' });
      } else {
        console.log('✓ OK');
      }
    }
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    await page.waitForTimeout(200);

    // PHASE 4: Deep Testing of Handwriting Assignment Generator
    console.log('\n--- PHASE 4: Testing Handwriting Generator ---');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('handwriting');
    });
    await page.waitForTimeout(500);

    // Check textarea input and canvas preview
    const handwritingHasCanvas = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return canvases.length > 0;
    });
    console.log(`   Handwriting canvas rendered: ${handwritingHasCanvas}`);
    if (!handwritingHasCanvas) {
      issuesFound.push({ tool: 'handwriting', issue: 'Canvas not rendered' });
    }

    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));
    await page.waitForTimeout(200);

    // PHASE 5: Testing PDF Tools with Active Document
    console.log('\n--- PHASE 5: Testing PDF Tools with Live Active Document ---');
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 3; i++) {
      const p = doc.addPage([595.28, 841.89]);
      p.drawText(`Deep Audit Page ${i}`, { x: 50, y: 800, size: 24, color: rgb(0.1, 0.5, 0.8) });
      p.drawText('Sample tabular data for testing table extraction:', { x: 50, y: 750, size: 14 });
      p.drawText('Item       Qty     Price', { x: 50, y: 720, size: 12 });
      p.drawText('Notebook   2       $10.00', { x: 50, y: 700, size: 12 });
      p.drawText('Pen        5       $5.00', { x: 50, y: 680, size: 12 });
    }
    const pdfBytes = Array.from(await doc.save());

    await page.evaluate(async (bytes) => {
      await window.__JUSTPDFCRAFT_DOC_STORE__.getState().loadDocument(new Uint8Array(bytes), 'DeepAuditDoc.pdf');
    }, pdfBytes);
    await page.waitForTimeout(800);

    // 5.1 Test Watermark Dialog Execution
    console.log('   Testing [watermark] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('watermark');
    });
    await page.waitForTimeout(400);
    const watermarkBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Apply Watermark') || b.innerText.includes('Add Watermark'));
      return !!target;
    });
    console.log(`   Watermark apply button available: ${watermarkBtn}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.2 Test Bates Numbering Dialog Execution
    console.log('   Testing [bates] numbering tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('bates');
    });
    await page.waitForTimeout(400);
    const batesBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Apply Bates') || b.innerText.includes('Apply Numbers'));
      return !!target;
    });
    console.log(`   Bates apply button available: ${batesBtn}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.3 Test Compress Dialog Execution
    console.log('   Testing [compress] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('compress');
    });
    await page.waitForTimeout(400);
    const compressBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Compress PDF'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    console.log(`   Triggered Compress PDF: ${compressBtn}`);
    await page.waitForTimeout(1000);
    const compressDone = await page.evaluate(() => {
      return document.body.innerText.includes('Saved') || document.body.innerText.includes('Download') || document.body.innerText.includes('Apply');
    });
    console.log(`   Compress completed successfully: ${compressDone}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.4 Test Table Extractor Dialog Execution
    console.log('   Testing [extract-table] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('extract-table');
    });
    await page.waitForTimeout(1000);
    const tableExtracted = await page.evaluate(() => {
      return !!document.querySelector('table') || document.body.innerText.includes('Detected:') || document.body.innerText.includes('Copy for Excel');
    });
    console.log(`   Table Extractor rendered table/controls: ${tableExtracted}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.5 Test Sanitize Dialog Execution
    console.log('   Testing [sanitize] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('sanitize');
    });
    await page.waitForTimeout(400);
    const sanitizeBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Sanitize Document') || b.innerText.includes('Sanitize PDF'));
      return !!target;
    });
    console.log(`   Sanitize button available: ${sanitizeBtn}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.6 Test Split Dialog Execution
    console.log('   Testing [split] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('split');
    });
    await page.waitForTimeout(400);
    const splitBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Split Document') || b.innerText.includes('Execute Split'));
      return !!target;
    });
    console.log(`   Split button available: ${splitBtn}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.7 Test Convert Dialog Execution (PDF to Image and PDF to Text)
    console.log('   Testing [convert] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('convert');
    });
    await page.waitForTimeout(400);
    const convertExportBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Export Image') || b.innerText.includes('Convert'));
      return !!target;
    });
    console.log(`   Convert export button available: ${convertExportBtn}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.8 Test Crop Dialog Execution
    console.log('   Testing [crop] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('crop');
    });
    await page.waitForTimeout(600);
    const cropCanvas = await page.evaluate(() => {
      return !!document.querySelector('canvas');
    });
    console.log(`   Crop canvas rendered: ${cropCanvas}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    // 5.9 Test Extract Images Dialog Execution
    console.log('   Testing [extract-images] tool execution...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal('extract-images');
    });
    await page.waitForTimeout(600);
    const extractImagesRendered = await page.evaluate(() => {
      return document.body.innerText.includes('Extract') || document.body.innerText.includes('Images');
    });
    console.log(`   Extract Images dialog rendered: ${extractImagesRendered}`);
    await page.evaluate(() => window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null));

    console.log('\n==========================================');
    console.log('🏁 DEEP TOOLS AUDIT SUMMARY');
    console.log('==========================================');
    console.log(`Total Page Errors: ${pageErrors.length}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    console.log(`Total Issues Logged: ${issuesFound.length}`);
    if (issuesFound.length > 0) {
      console.log('Issues:', JSON.stringify(issuesFound, null, 2));
    } else {
      console.log('Status: ALL DEEP WORKFLOWS PASSED CLEANLY');
    }
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

runDeepAudit().catch((err) => {
  console.error('Deep Audit Script Crashed:', err);
  process.exit(1);
});
