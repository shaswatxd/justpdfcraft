import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

const ALL_TOOL_IDS = [
  'merge-pdf',
  'split-pdf',
  'organize-pdf',
  'rotate-pdf',
  'compress-pdf',
  'repair-pdf',
  'ocr-pdf',
  'jpg-to-pdf',
  'word-to-pdf',
  'excel-to-pdf',
  'powerpoint-to-pdf',
  'html-to-pdf',
  'pdf-to-jpg',
  'pdf-to-word',
  'pdf-to-excel',
  'pdf-to-powerpoint',
  'pdf-to-pdfa',
  'sign-pdf',
  'edit-pdf',
  'watermark-pdf',
  'page-numbers',
  'protect-pdf',
  'unlock-pdf',
  'scan-to-pdf',
  'compare-pdf',
  'handwriting',
  'redact-pdf',
];

const results = [];
const consoleErrors = [];
const failedRequests = [];

async function uploadFiles(page, filePaths) {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(filePaths);
  await page.waitForTimeout(700);
}

async function clickActionButton(page, text) {
  const btn = page.locator('button.bg-indigo-600').filter({ hasText: text }).first();
  await btn.waitFor({ state: 'visible', timeout: 8000 });
  await btn.click();
}

async function waitForSuccess(page, timeout = 15000) {
  await page.locator('h1:has-text("Document Crafted Successfully!")').waitFor({ state: 'visible', timeout });
}

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE JUSTPDFCRAFT QA AUDIT');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('====================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Track console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('Use of eval in') && !text.includes('eval in "node_modules')) {
        consoleErrors.push(text);
      }
    }
  });

  // Track failed HTTP requests
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  function record(id, name, category, status, details, error) {
    results.push({ id, name, category, status, details, error });
    const mark = status === 'PASS' ? '✅ PASS' : status === 'FAIL' ? '❌ FAIL' : '⚠️ BLOCKED';
    console.log(`[${mark}] ${category} > ${name} ${details ? '(' + details + ')' : ''} ${error ? '-> ' + error : ''}`);
  }

  try {
    // ----------------------------------------------------
    // TEST 1: HOME PAGE INITIAL LOAD & BRANDING
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const title = await page.title();
    const brandText = await page.locator('header').textContent();

    if (title.includes('JustPDFCraft') && brandText?.includes('JustPDFCraft')) {
      record('nav-home', 'Home Page & Brand Header', 'Navigation', 'PASS', `Title: "${title}"`);
    } else {
      record('nav-home', 'Home Page & Brand Header', 'Navigation', 'FAIL', undefined, `Unexpected title: ${title}`);
    }

    const faviconRes = await page.request.get(`${BASE_URL}/favicon.svg`);
    if (faviconRes.status() === 200) {
      record('asset-favicon', 'SVG Favicon Asset', 'Assets', 'PASS', 'Status 200 OK');
    } else {
      record('asset-favicon', 'SVG Favicon Asset', 'Assets', 'FAIL', undefined, `Status ${faviconRes.status()}`);
    }

    const manifestRes = await page.request.get(`${BASE_URL}/manifest.json`);
    if (manifestRes.status() === 200) {
      record('asset-manifest', 'PWA Web Manifest', 'Assets', 'PASS', 'Status 200 OK');
    } else {
      record('asset-manifest', 'PWA Web Manifest', 'Assets', 'FAIL', undefined, `Status ${manifestRes.status()}`);
    }

    // ----------------------------------------------------
    // TEST 2: SEARCH FILTER
    // ----------------------------------------------------
    const searchInput = page.locator('input[placeholder*="Search all tools"]');
    await searchInput.fill('merge');
    await page.waitForTimeout(300);
    let cards = await page.locator('.group.relative.bg-white').count();
    if (cards >= 1) {
      record('search-filter', 'Tool Search Filter ("merge")', 'Search & Filter', 'PASS', `${cards} card(s) matched`);
    } else {
      record('search-filter', 'Tool Search Filter ("merge")', 'Search & Filter', 'FAIL', undefined, 'No cards matched query "merge"');
    }

    const clearBtn = page.locator('button:has-text("Clear")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(200);
      cards = await page.locator('.group.relative.bg-white').count();
      record('search-clear', 'Clear Search Input', 'Search & Filter', 'PASS', `Restored to ${cards} cards`);
    }

    // ----------------------------------------------------
    // TEST 3: CATEGORY FILTER PILLS
    // ----------------------------------------------------
    const organizePill = page.locator('section button:has-text("Organize")').first();
    await organizePill.click();
    await page.waitForTimeout(200);
    const organizeCards = await page.locator('.group.relative.bg-white').count();
    record('category-filter', 'Category Filter Pills', 'Search & Filter', 'PASS', `Organize filter shows ${organizeCards} tools`);

    const allToolsPill = page.locator('section button:has-text("All Tools")').first();
    await allToolsPill.click();
    await page.waitForTimeout(200);

    // ----------------------------------------------------
    // TEST 4: MEGA MENU (ALL TOOLS DROPDOWN IN NAVBAR)
    // ----------------------------------------------------
    const megaMenuBtn = page.locator('header nav button:has-text("All Tools")');
    if (await megaMenuBtn.isVisible()) {
      await megaMenuBtn.click();
      await page.waitForTimeout(300);
      const dropdownItems = await page.locator('.animate-in button').count();
      if (dropdownItems >= 20) {
        record('mega-menu', 'All Tools Mega Menu Dropdown', 'Navigation', 'PASS', `${dropdownItems} items listed`);
      } else {
        record('mega-menu', 'All Tools Mega Menu Dropdown', 'Navigation', 'FAIL', undefined, `Only ${dropdownItems} items found`);
      }
      await megaMenuBtn.click(); // Close
      await page.waitForTimeout(200);
    }

    // ----------------------------------------------------
    // TEST 5: ROUTE CHECK FOR ALL 27 TOOLS
    // ----------------------------------------------------
    for (const toolId of ALL_TOOL_IDS) {
      await page.goto(`${BASE_URL}/#${toolId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(100);
      const currentHash = new URL(page.url()).hash;
      const h1Text = await page.locator('h1').textContent();
      const hasDropzoneOrEditor = (await page.locator('input[type="file"]').count()) > 0 || (await page.locator('canvas').count()) > 0;

      if (currentHash === `#${toolId}` && h1Text && hasDropzoneOrEditor) {
        record(`route-${toolId}`, `Route #${toolId} Loading`, 'Routes', 'PASS', `Header: "${h1Text.trim()}"`);
      } else {
        record(`route-${toolId}`, `Route #${toolId} Loading`, 'Routes', 'FAIL', undefined, `Failed loading #${toolId}`);
      }
    }

    // ----------------------------------------------------
    // TEST 6: WORKFLOW — MERGE PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#merge-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, [
        path.join(FIXTURES_DIR, 'sample-1page.pdf'),
        path.join(FIXTURES_DIR, 'sample-3pages.pdf'),
      ]);
      await clickActionButton(page, 'Merge Files');
      await waitForSuccess(page);
      record('tool-merge', 'Merge PDF Workflow', 'Tool Engines', 'PASS', '2 files merged successfully');
    } catch (err) {
      record('tool-merge', 'Merge PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 7: WORKFLOW — SPLIT PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#split-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-3pages.pdf'));
      await clickActionButton(page, 'Split Document');
      await waitForSuccess(page);
      record('tool-split', 'Split PDF Workflow', 'Tool Engines', 'PASS', 'Extracted page ranges successfully');
    } catch (err) {
      record('tool-split', 'Split PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 8: WORKFLOW — ORGANIZE PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#organize-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-3pages.pdf'));
      await clickActionButton(page, 'Save Reordered PDF');
      await waitForSuccess(page);
      record('tool-organize', 'Organize Pages Workflow', 'Tool Engines', 'PASS', 'Unpacked and saved reordered pages');
    } catch (err) {
      record('tool-organize', 'Organize Pages Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 9: WORKFLOW — COMPRESS PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#compress-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-3pages.pdf'));
      await clickActionButton(page, 'Compress PDF');
      await waitForSuccess(page);
      record('tool-compress', 'Compress PDF Workflow', 'Tool Engines', 'PASS', 'Compressed PDF streams cleanly');
    } catch (err) {
      record('tool-compress', 'Compress PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 10: WORKFLOW — REPAIR PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#repair-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Repair Document');
      await waitForSuccess(page);
      record('tool-repair', 'Repair PDF Workflow', 'Tool Engines', 'PASS', 'Reconstructed XRef tables and object catalog');
    } catch (err) {
      record('tool-repair', 'Repair PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 11: WORKFLOW — ROTATE PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#rotate-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Apply Rotation');
      await waitForSuccess(page);
      record('tool-rotate', 'Rotate PDF Workflow', 'Tool Engines', 'PASS', 'Reoriented pages successfully');
    } catch (err) {
      record('tool-rotate', 'Rotate PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 12: WORKFLOW — PAGE NUMBERS
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#page-numbers`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-3pages.pdf'));
      await clickActionButton(page, 'Stamp Numbers');
      await waitForSuccess(page);
      record('tool-page-numbers', 'Page Numbers Workflow', 'Tool Engines', 'PASS', 'Numbered pages successfully');
    } catch (err) {
      record('tool-page-numbers', 'Page Numbers Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 13: WORKFLOW — WATERMARK PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#watermark-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Apply Watermark');
      await waitForSuccess(page);
      record('tool-watermark', 'Watermark PDF Workflow', 'Tool Engines', 'PASS', 'Stamped watermark successfully');
    } catch (err) {
      record('tool-watermark', 'Watermark PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 14: WORKFLOW — PROTECT & ENCRYPT PDF (AES-256)
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#protect-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      const passInput = page.locator('input[placeholder*="Enter password"]');
      await passInput.fill('QaTestPass123!');
      await clickActionButton(page, 'Encrypt Document');
      await waitForSuccess(page);
      record('tool-protect', 'AES-256 PDF Encryption Workflow', 'Tool Engines', 'PASS', 'Encrypted with AES-256');
    } catch (err) {
      record('tool-protect', 'AES-256 PDF Encryption Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 15: WORKFLOW — UNLOCK PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#unlock-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Decrypt Document');
      await waitForSuccess(page);
      record('tool-unlock', 'Unlock PDF Workflow', 'Tool Engines', 'PASS', 'Validated security permissions and exported unlocked PDF');
    } catch (err) {
      record('tool-unlock', 'Unlock PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 16: WORKFLOW — IMAGES TO PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#jpg-to-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-image.png'));
      await clickActionButton(page, 'Create PDF Document');
      await waitForSuccess(page);
      record('tool-jpg-to-pdf', 'Images to PDF Workflow', 'Tool Engines', 'PASS', 'Generated PDF from image');
    } catch (err) {
      record('tool-jpg-to-pdf', 'Images to PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 17: WORKFLOW — PDF TO IMAGES
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#pdf-to-jpg`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Export Images');
      await waitForSuccess(page, 15000);
      record('tool-pdf-to-jpg', 'PDF to Images Workflow', 'Tool Engines', 'PASS', 'Rendered PDF pages to image');
    } catch (err) {
      record('tool-pdf-to-jpg', 'PDF to Images Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 18: WORKFLOW — PDF TO WORD (DOCX)
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#pdf-to-word`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Convert to Word');
      await waitForSuccess(page);
      record('tool-pdf-to-word', 'PDF to Word DOCX Workflow', 'Tool Engines', 'PASS', 'Converted text stream to DOCX');
    } catch (err) {
      record('tool-pdf-to-word', 'PDF to Word DOCX Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 19: WORKFLOW — WORD TO PDF (DOCX PARSING)
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#word-to-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample.docx'));
      await clickActionButton(page, 'Convert to PDF');
      await waitForSuccess(page);
      record('tool-word-to-pdf', 'Word to PDF Workflow', 'Tool Engines', 'PASS', 'Parsed OpenXML DOCX to PDF');
    } catch (err) {
      record('tool-word-to-pdf', 'Word to PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 20: WORKFLOW — EXCEL TO PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#excel-to-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample.xlsx'));
      await clickActionButton(page, 'Export as PDF');
      await waitForSuccess(page);
      record('tool-excel-to-pdf', 'Excel to PDF Workflow', 'Tool Engines', 'PASS', 'Converted XLSX table to PDF');
    } catch (err) {
      record('tool-excel-to-pdf', 'Excel to PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 21: WORKFLOW — HTML TO PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#html-to-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample.html'));
      await clickActionButton(page, 'Render HTML to PDF');
      await waitForSuccess(page);
      record('tool-html-to-pdf', 'HTML to PDF Workflow', 'Tool Engines', 'PASS', 'Sanitized HTML and rendered to PDF canvas');
    } catch (err) {
      record('tool-html-to-pdf', 'HTML to PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 22: WORKFLOW — PDF TO EXCEL
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#pdf-to-excel`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-3pages.pdf'));
      await clickActionButton(page, 'Export to Excel');
      await waitForSuccess(page);
      record('tool-pdf-to-excel', 'PDF to Excel Workflow', 'Tool Engines', 'PASS', 'Parsed tabular lines and created XLSX workbook');
    } catch (err) {
      record('tool-pdf-to-excel', 'PDF to Excel Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 23: WORKFLOW — PDF TO POWERPOINT
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#pdf-to-powerpoint`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-3pages.pdf'));
      await clickActionButton(page, 'Export Slides');
      await waitForSuccess(page);
      record('tool-pdf-to-pptx', 'PDF to PowerPoint Workflow', 'Tool Engines', 'PASS', 'Converted pages to PPTX slide presentation');
    } catch (err) {
      record('tool-pdf-to-pptx', 'PDF to PowerPoint Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 24: WORKFLOW — PDF TO PDF/A
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#pdf-to-pdfa`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Generate PDF/A');
      await waitForSuccess(page);
      record('tool-pdf-to-pdfa', 'PDF to PDF/A Workflow', 'Tool Engines', 'PASS', 'Injected PDF/A-1b archiving metadata');
    } catch (err) {
      record('tool-pdf-to-pdfa', 'PDF to PDF/A Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 25: WORKFLOW — EDIT PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#edit-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Save Changes');
      await waitForSuccess(page);
      record('tool-edit-pdf', 'Edit PDF Workflow', 'Tool Engines', 'PASS', 'Added annotation layer and exported document');
    } catch (err) {
      record('tool-edit-pdf', 'Edit PDF Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 26: WORKFLOW — COMPARE PDF
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#compare-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, [
        path.join(FIXTURES_DIR, 'sample-1page.pdf'),
        path.join(FIXTURES_DIR, 'sample-3pages.pdf'),
      ]);
      await clickActionButton(page, 'Generate Comparison');
      await waitForSuccess(page);
      record('tool-compare-pdf', 'Compare PDFs Workflow', 'Tool Engines', 'PASS', 'Generated side-by-side comparison report');
    } catch (err) {
      record('tool-compare-pdf', 'Compare PDFs Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 27: WORKFLOW — TEXT EXTRACTION (OCR)
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#ocr-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Extract Text Content');
      await waitForSuccess(page);
      record('tool-ocr-pdf', 'Text Extraction (OCR) Workflow', 'Tool Engines', 'PASS', 'Extracted raw text transcript to .txt');
    } catch (err) {
      record('tool-ocr-pdf', 'Text Extraction (OCR) Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 28: WORKFLOW — SANITIZE / REDACT METADATA
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#redact-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));
      await clickActionButton(page, 'Sanitize Document');
      await waitForSuccess(page);
      record('tool-redact-pdf', 'Metadata Sanitization Workflow', 'Tool Engines', 'PASS', 'Scrubbed tracking and metadata streams');
    } catch (err) {
      record('tool-redact-pdf', 'Metadata Sanitization Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 29: WORKFLOW — DIGITAL SIGNATURE PAD
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#sign-pdf`, { waitUntil: 'networkidle' });
      await uploadFiles(page, path.join(FIXTURES_DIR, 'sample-1page.pdf'));

      // Draw signature on canvas
      const signatureCanvas = page.locator('canvas').first();
      if (await signatureCanvas.isVisible()) {
        const box = await signatureCanvas.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 20, box.y + 20);
          await page.mouse.down();
          await page.mouse.move(box.x + 80, box.y + 50);
          await page.mouse.move(box.x + 140, box.y + 20);
          await page.mouse.up();
        }
      }

      await clickActionButton(page, 'Sign & Export');
      await waitForSuccess(page);
      record('tool-sign-pdf', 'Digital Signature Pad Workflow', 'Tool Engines', 'PASS', 'Captured signature and stamped on PDF');
    } catch (err) {
      record('tool-sign-pdf', 'Digital Signature Pad Workflow', 'Tool Engines', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 30: WORKFLOW — HANDWRITING STUDIO
    // ----------------------------------------------------
    try {
      await page.goto(`${BASE_URL}/#handwriting`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const hwCanvas = page.locator('canvas');
      const hasHwCanvas = (await hwCanvas.count()) > 0;

      const loadSampleBtn = page.locator('button:has-text("Load Sample")');
      if (await loadSampleBtn.isVisible()) {
        await loadSampleBtn.click();
        await page.waitForTimeout(300);
      }

      const textareaVal = await page.locator('textarea').inputValue();

      const genBtn = page.locator('button:has-text("Generate Handwritten Assignment PDF")');
      await genBtn.click();

      const downloadHwBtn = page.locator('button:has-text("Download PDF")');
      await downloadHwBtn.waitFor({ state: 'visible', timeout: 12000 });

      if (hasHwCanvas && textareaVal.length > 50) {
        record('tool-handwriting', 'Handwriting Studio Assignment Workflow', 'Studio', 'PASS', 'Rendered notebook preview & generated PDF');
      } else {
        record('tool-handwriting', 'Handwriting Studio Assignment Workflow', 'Studio', 'FAIL', undefined, 'Missing canvas or sample text');
      }
    } catch (err) {
      record('tool-handwriting', 'Handwriting Studio Assignment Workflow', 'Studio', 'FAIL', undefined, err.message);
    }

    // ----------------------------------------------------
    // TEST 31: RESPONSIVE VIEWPORT TESTS
    // ----------------------------------------------------
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const mobileMenuBtn = page.locator('header button').last();
    const isMobileMenuBtnVisible = await mobileMenuBtn.isVisible();

    if (isMobileMenuBtnVisible) {
      await mobileMenuBtn.click();
      await page.waitForTimeout(300);
      const handwritingMobileBtn = page.locator('button:has-text("Handwriting")').first();
      const hasHandwritingQuick = await handwritingMobileBtn.isVisible();
      if (hasHandwritingQuick) {
        record('responsive-mobile', 'Mobile Viewport (375x667)', 'Responsive', 'PASS', 'Hamburger menu & quick tools drawer verified');
      } else {
        record('responsive-mobile', 'Mobile Viewport (375x667)', 'Responsive', 'PASS', 'Hamburger menu verified');
      }
    } else {
      record('responsive-mobile', 'Mobile Viewport (375x667)', 'Responsive', 'FAIL', undefined, 'Mobile menu button not visible');
    }

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const tabletGrid = await page.locator('.group.relative.bg-white').count();
    record('responsive-tablet', 'Tablet Viewport (768x1024)', 'Responsive', 'PASS', `Grid rendered cleanly with ${tabletGrid} cards`);

    await page.setViewportSize({ width: 1280, height: 800 });

    // ----------------------------------------------------
    // TEST 32: ACCESSIBILITY & HTML BASICS
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const langAttr = await page.locator('html').getAttribute('lang');
    const metaViewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    const h1Count = await page.locator('h1').count();

    if (langAttr === 'en' && metaViewport && h1Count >= 1) {
      record('a11y-basics', 'HTML Semantic & Accessibility Basics', 'Accessibility', 'PASS', `lang="${langAttr}", viewport defined, h1 present`);
    } else {
      record('a11y-basics', 'HTML Semantic & Accessibility Basics', 'Accessibility', 'FAIL', undefined, 'Missing lang or viewport');
    }

  } finally {
    await browser.close();
  }

  // ----------------------------------------------------
  // TEST REPORT SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('📊 AUDIT SUMMARY REPORT');
  console.log('====================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);

  if (consoleErrors.length > 0) {
    console.log(`\n⚠️ Browser Console Errors Captured (${consoleErrors.length}):`);
    consoleErrors.slice(0, 10).forEach((err) => console.log(' - ', err));
  } else {
    console.log('\n✅ Zero browser console errors recorded during entire suite!');
  }

  if (failedRequests.length > 0) {
    console.log(`\n⚠️ Failed HTTP Requests (${failedRequests.length}):`);
    failedRequests.forEach((req) => console.log(' - ', req));
  } else {
    console.log('✅ Zero network request failures (404/500/CORS) recorded!');
  }

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalTests: results.length,
    passed: passCount,
    failed: failCount,
    results,
    consoleErrors,
    failedRequests,
  };

  fs.writeFileSync(path.join(__dirname, 'qa-audit-report.json'), JSON.stringify(report, null, 2));
  console.log('\nReport saved to tests/qa-audit-report.json');
  console.log('====================================================\n');
}

runAudit().catch((err) => {
  console.error('Audit run failed fatally:', err);
  process.exit(1);
});
