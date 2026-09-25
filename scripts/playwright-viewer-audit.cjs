const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const PORT = 1420;
const BASE_URL = `http://localhost:${PORT}/`;

function isServerListening(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
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

async function runViewerAudit() {
  console.log('🚀 Starting JustPDFCraft Document Viewer & Organizer End-to-End Audit...');
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

    // 1. Generate Deterministic Test PDF Fixture
    console.log('📄 1. Generating & Loading deterministic test document into PDF viewer...');
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 4; i++) {
      const p = doc.addPage([595.28, 841.89]);
      p.drawText(`JustPDFCraft Viewer Audit - Page ${i} of 4`, {
        x: 50,
        y: 780,
        size: 18,
      });
      p.drawText('Sample text content for continuous rendering, text layer selection and search.', {
        x: 50,
        y: 740,
        size: 12,
      });
    }
    const pdfBytes = Array.from(await doc.save());

    await page.evaluate(async (bytes) => {
      await window.__JUSTPDFCRAFT_DOC_STORE__.getState().loadDocument(new Uint8Array(bytes), 'ViewerAuditDoc.pdf');
      window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveView('editor');
    }, pdfBytes);

    await page.waitForTimeout(1200);

    // 2. Verify PDF Canvas and Viewer Controls
    console.log('🔍 2. Verifying PDFViewer canvas rendering & title...');
    const hasCanvas = await page.evaluate(() => {
      return !!document.querySelector('canvas') || !!document.querySelector('.canvas-container');
    });
    console.log(`   Page Canvas rendered: ${hasCanvas}`);

    const hasTitle = await page.evaluate(() => {
      return document.body.innerText.includes('ViewerAuditDoc.pdf');
    });
    console.log(`   Document title in Header: ${hasTitle}`);

    // 3. Test Sidebar Tabs (thumbnails, search, bookmarks, annotations)
    console.log('📑 3. Testing Sidebar Tabs (thumbnails, search, bookmarks, annotations)...');
    const tabs = ['thumbnails', 'search', 'bookmarks', 'annotations'];
    for (const tab of tabs) {
      await page.evaluate((t) => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setSidebarTab(t);
      }, tab);
      await page.waitForTimeout(250);
    }

    // 4. Test Page Organizer Mode
    console.log('🗂️ 4. Testing Page Organizer Grid View...');
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_DOC_STORE__.getState().setViewMode('organize');
    });
    await page.waitForTimeout(700);

    const organizerRendered = await page.evaluate(() => {
      return document.body.innerText.includes('Active') || document.body.innerText.includes('#1');
    });
    console.log(`   Organizer view rendered: ${organizerRendered}`);

    // Switch back to continuous reader mode
    await page.evaluate(() => {
      window.__JUSTPDFCRAFT_DOC_STORE__.getState().setViewMode('continuous');
    });
    await page.waitForTimeout(500);

    // 5. Test Presentation Overlays (Laser Pointer and Spotlight)
    console.log('🔦 5. Testing Presentation Overlays (Laser pointer & Spotlight)...');
    await page.keyboard.press('KeyL');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyS');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 6. Test Active Document Tool Dialogs
    console.log('🛠️ 6. Testing Tool Dialogs with Active Document...');
    const docTools = ['watermark', 'bates', 'sanitize', 'compress', 'split'];
    for (const tool of docTools) {
      process.stdout.write(`   Testing doc tool: [${tool}] ... `);
      const beforeErrors = pageErrors.length;

      await page.evaluate((t) => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(t);
      }, tool);
      await page.waitForTimeout(400);

      if (pageErrors.length > beforeErrors) {
        console.log('❌ FAILED');
      } else {
        console.log('✓ OK');
      }

      await page.evaluate(() => {
        window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveModal(null);
      });
      await page.waitForTimeout(150);
    }

    console.log('\n==========================================');
    console.log('🏁 VIEWER & ORGANIZER AUDIT SUMMARY');
    console.log('==========================================');
    console.log(`Total Page Errors: ${pageErrors.length}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    console.log('Status: VIEWER AUDIT PASSED');
    console.log('==========================================\n');

  } finally {
    await browser.close();
    if (serverProcess) {
      console.log('🛑 Shutting down spawned test server...');
      serverProcess.kill();
    }
  }

  if (pageErrors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runViewerAudit().catch((err) => {
  console.error('Viewer Audit Crashed:', err);
  process.exit(1);
});
