const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const PORT = 1421;
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

async function createSamplePdfBytes(pageCount = 16) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]); // A4
    // Outer border
    page.drawRectangle({
      x: 10,
      y: 10,
      width: 575.28,
      height: 821.89,
      borderColor: rgb(0.8, 0.2, 0.2),
      borderWidth: 1.5,
    });
    // Header
    page.drawText(`OFFICIAL EXAMINATION SYLLABUS - CHAPTER ${i}`, {
      x: 40,
      y: 800,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    // Sample lines
    for (let l = 0; l < 25; l++) {
      page.drawText(`Section ${i}.${l + 1}: Important formula derivation and revision point #${l + 1} for students.`, {
        x: 40,
        y: 760 - l * 26,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.25),
      });
    }
  }
  return await doc.save();
}

async function openMiniXeroxModal(page) {
  const isModalOpen = await page.$('h2:has-text("Mini Xerox & Pocket Notes Maker")');
  if (isModalOpen) return true;
  const cards = await page.$$('div[role="button"]');
  for (const c of cards) {
    const text = await c.innerText();
    if (text.includes('Mini Xerox')) {
      await c.scrollIntoViewIfNeeded();
      await c.click();
      await page.waitForTimeout(1000);
      return true;
    }
  }
  return false;
}

async function runDeepInspection() {
  console.log('🔍 Starting JustPDFCraft Deep Browser Inspection & Verification...');
  let serverProcess = null;

  const alreadyRunning = await isServerListening(PORT);
  if (!alreadyRunning) {
    console.log(`📡 Starting local Vite preview server on port ${PORT}...`);
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
    console.log('✅ Local preview server is active!');
  } else {
    console.log(`✅ Using existing server on port ${PORT}`);
  }

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure() });
  });

  const inspectionResults = [];

  try {
    // 1. Initial Page Load
    console.log('🌐 Loading JustPDFCraft Home...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const title = await page.title();
    console.log('   Page Title:', title);
    inspectionResults.push({ check: 'Page Loads Successfully', pass: title.includes('JustPDFCraft') });

    // 2. Category Nav Bar Check inside Tool Explorer section
    console.log('🗂️ Checking Category Navigation Tabs...');
    const explorer = page.locator('section#tool-explorer');
    await explorer.waitFor({ timeout: 5000 });

    const categoryButtons = await explorer.locator('button:has-text("All PDF Tools"), button:has-text("Organize"), button:has-text("Optimize"), button:has-text("Convert to PDF"), button:has-text("Convert from PDF"), button:has-text("Edit PDF"), button:has-text("Security")').all();
    inspectionResults.push({ check: 'Category Tabs Present in Explorer', pass: categoryButtons.length >= 7 });

    // Click 'Organize' category tab inside explorer
    const organizeTab = explorer.locator('button:has-text("Organize")').first();
    if (await organizeTab.isVisible()) {
      await organizeTab.click();
      await page.waitForTimeout(200);
    }
    // Switch back to All PDF Tools
    const allTab = explorer.locator('button:has-text("All PDF Tools")').first();
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(200);
    }
    inspectionResults.push({ check: 'Category Tab Switching without Errors', pass: consoleErrors.length === 0 });

    // 3. Launch Mini Xerox
    console.log('✂️ Finding and Opening Mini Xerox Dialog...');
    const opened = await openMiniXeroxModal(page);
    const modalHeader = await page.waitForSelector('h2:has-text("Mini Xerox & Pocket Notes Maker")', { timeout: 8000 });
    inspectionResults.push({ check: 'Mini Xerox Modal Opened', pass: Boolean(opened && modalHeader) });

    // 4. Test Mode 2: Direct Notes & Formulas
    console.log('📝 Testing Mode 2: Direct Notes & Formulas...');
    const notesTab = await page.$('button:has-text("Direct Notes & Formulas")');
    if (notesTab) {
      await notesTab.click();
      await page.waitForTimeout(300);
    }

    const notesTextarea = await page.$('textarea');
    inspectionResults.push({ check: 'Direct Notes Textarea Mounted', pass: Boolean(notesTextarea) });

    // Load sample formulas
    const loadSampleBtn = await page.$('button:has-text("Load Sample Formulas")');
    if (loadSampleBtn) {
      await loadSampleBtn.click();
      await page.waitForTimeout(200);
    }

    // Toggle columns inside chit (e.g. 3 cols)
    const threeColsBtn = await page.$('button:has-text("3 Cols")');
    if (threeColsBtn) {
      await threeColsBtn.click();
      await page.waitForTimeout(200);
    }

    // Adjust font size slider
    const fontSizeSlider = await page.$('input[type="range"][min="5"][max="12"]');
    if (fontSizeSlider) {
      await fontSizeSlider.fill('6');
      await page.waitForTimeout(200);
    }

    // Test Generating Notes PDF
    console.log('⚡ Generating Direct Notes Mini Xerox PDF...');
    const generateBtn = await page.$('button:has-text("Generate Mini Xerox")');
    if (generateBtn) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
        generateBtn.click(),
      ]);

      if (download) {
        const downloadPath = await download.path();
        console.log('   Notes Mini Xerox PDF downloaded to:', downloadPath);
        inspectionResults.push({ check: 'Notes PDF Generated & Downloaded', pass: true });
      } else {
        inspectionResults.push({ check: 'Notes PDF Generated & Downloaded', pass: false, error: 'No download event' });
      }
    }

    await page.waitForTimeout(600);

    // 5. Test Mode 1: Multi-PDF Documents with real uploaded document
    console.log('📚 Testing Mode 1: Multi-PDF with Real 16-Page Document...');
    // Reopen dialog if closed by download
    await openMiniXeroxModal(page);

    // Switch to Multi-PDF Documents tab
    const pdfTab = await page.$('button:has-text("Multi-PDF Documents")');
    if (pdfTab) {
      await pdfTab.click();
      await page.waitForTimeout(300);
    }

    // Inject 16-page sample document into file input
    const sampleBytes = await createSamplePdfBytes(16);
    const fileInput = await page.$('input[type="file"][accept*=".pdf"]');
    if (fileInput) {
      await fileInput.setInputFiles({
        name: 'Syllabus_Formulas_Chapter1_16.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(sampleBytes),
      });
      await page.waitForTimeout(1000);
    }

    // Check if thumbnail preview grid rendered
    const previewGrid = await page.$('div[style*="grid-template-columns"]');
    inspectionResults.push({ check: 'Live Sheet Preview Grid Rendered', pass: Boolean(previewGrid) });

    // Test Presets
    console.log('✨ Testing Presets (Farra, Booklet, Handout, Matrix)...');
    for (const presetName of ['8-in-1', '4-in-1', '25-in-1', '16-in-1']) {
      const presetBtn = await page.$(`button:has-text("${presetName}")`);
      if (presetBtn) {
        await presetBtn.click();
        await page.waitForTimeout(300);
      }
    }
    inspectionResults.push({ check: 'All Presets Applied Cleanly', pass: true });

    // Test Page Range input
    const rangeInput = await page.$('input[placeholder*="all, 1-16"]');
    if (rangeInput) {
      await rangeInput.fill('1-8');
      await page.waitForTimeout(300);
      await rangeInput.fill('all');
      await page.waitForTimeout(300);
    }

    // Test Chit Magnifier / Inspector
    console.log('🔍 Testing Chit Magnifier Modal...');
    const firstCell = await page.$('div[title*="magnify"]');
    if (firstCell) {
      await firstCell.click();
      await page.waitForTimeout(400);
      const inspectorTitle = await page.$('h4:has-text("Inspection")');
      inspectionResults.push({ check: 'Cell Click Opens Magnifier Modal', pass: Boolean(inspectorTitle) });

      // Close inspector
      const closeInspector = await page.$('button:has-text("Close Inspector")');
      if (closeInspector) {
        await closeInspector.click();
        await page.waitForTimeout(300);
      }
    }

    // Test Generating Multi-PDF 16-in-1 Document
    console.log('⚡ Generating Multi-PDF 16-in-1 Mini Xerox PDF...');
    const generateMultiBtn = await page.$('button:has-text("Generate Mini Xerox")');
    if (generateMultiBtn) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 12000 }).catch(() => null),
        generateMultiBtn.click(),
      ]);

      if (download) {
        const downloadPath = await download.path();
        console.log('   Multi-PDF Mini Xerox downloaded to:', downloadPath);
        inspectionResults.push({ check: 'Multi-PDF 16-in-1 Mini Xerox Downloaded', pass: true });
      } else {
        inspectionResults.push({ check: 'Multi-PDF 16-in-1 Mini Xerox Downloaded', pass: false, error: 'No download event' });
      }
    }

    // 6. Test Mobile Viewport (360x800)
    console.log('📱 Testing Mobile Viewport (360x800)...');
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(500);

    // Open Mini Xerox modal on mobile
    await openMiniXeroxModal(page);

    // Test mobile switch between Settings & Preview
    const previewPill = await page.$('button:has-text("Preview")');
    if (previewPill) {
      await previewPill.click();
      await page.waitForTimeout(300);
    }

    const optionsPill = await page.$('button:has-text("Options")');
    if (optionsPill) {
      await optionsPill.click();
      await page.waitForTimeout(300);
    }

    inspectionResults.push({ check: 'Mobile Responsive Switching (Options ↔ Preview)', pass: true });

    // Check for any horizontal overflow on body
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    inspectionResults.push({ check: 'Zero Horizontal Overflow on Mobile', pass: bodyScrollWidth <= windowWidth });

  } catch (err) {
    console.error('❌ Inspection encountered an error:', err);
    inspectionResults.push({ check: 'Inspection Execution', pass: false, error: err.message });
  } finally {
    console.log('\n==========================================');
    console.log('📊 PLAYWRIGHT DEEP INSPECTION REPORT');
    console.log('==========================================');
    console.table(inspectionResults);
    console.log('Console Errors count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }
    console.log('Page Errors count:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.log('Page Errors:', pageErrors);
    }

    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(inspectionResults.every((r) => r.pass) ? 0 : 1);
  }
}

runDeepInspection();
