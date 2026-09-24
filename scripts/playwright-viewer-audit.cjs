const { chromium } = require('playwright');

async function runViewerAudit() {
  console.log('🚀 Starting JustPDFCraft Document Viewer & Annotation End-to-End Audit...');
  
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
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

  await page.goto('http://localhost:1420/', { waitUntil: 'networkidle' });

  // 1. Create a Blank Document or Load Document via Click
  console.log('📄 Loading a multi-page PDF into viewer...');
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`JustPDFCraft Test Document - Page ${i}`, {
      x: 50,
      y: 780,
      size: 20,
    });
    p.drawText('Sample text for search and OCR testing. Confidential test record.', {
      x: 50,
      y: 740,
      size: 12,
    });
  }
  const pdfBytes = Array.from(await doc.save());

  await page.evaluate(async (bytes) => {
    const { useDocumentStore } = await import('/src/stores/documentStore.ts');
    const { useUIStore } = await import('/src/stores/uiStore.ts');
    await useDocumentStore.getState().loadDocument(new Uint8Array(bytes), 'TestAuditDoc.pdf');
    useUIStore.getState().setActiveView('editor');
  }, pdfBytes);

  // Wait for viewer to mount and render pages
  await page.waitForTimeout(1500);

  // 2. Verify PDF Viewer UI Elements
  console.log('🔍 Checking PDFViewer rendering and toolbar...');
  const viewerVisible = await page.evaluate(() => {
    return !!document.querySelector('.canvas-container, canvas, [data-page-number]');
  });
  console.log(`   Page canvas visible: ${viewerVisible}`);

  // Check Document Header / Title
  const docTitle = await page.evaluate(() => {
    return document.body.innerText.includes('TestAuditDoc.pdf');
  });
  console.log(`   Document Title present in UI: ${docTitle}`);

  // 3. Test Sidebar Navigation & Tabs
  console.log('📑 Testing Sidebar Tabs (thumbnails, search, bookmarks, annotations)...');
  const tabs = ['thumbnails', 'search', 'bookmarks', 'annotations'];
  for (const tab of tabs) {
    await page.evaluate(async (t) => {
      const { useUIStore } = await import('/src/stores/uiStore.ts');
      useUIStore.getState().setSidebarTab(t);
    }, tab);
    await page.waitForTimeout(300);
  }

  // 4. Test View Modes (Organize Mode)
  console.log('🗂️ Testing Page Organizer Mode...');
  await page.evaluate(async () => {
    const { useDocumentStore } = await import('/src/stores/documentStore.ts');
    useDocumentStore.getState().setViewMode('organize');
  });
  await page.waitForTimeout(800);

  // Check if organizer rendered
  const organizerVisible = await page.evaluate(() => {
    return document.body.innerText.includes('Page Organizer') || document.body.innerText.includes('Rotate') || !!document.querySelector('[data-grid-item]');
  });
  console.log(`   Organizer View rendered: ${organizerVisible}`);

  // Switch back to continuous viewer
  await page.evaluate(async () => {
    const { useDocumentStore } = await import('/src/stores/documentStore.ts');
    useDocumentStore.getState().setViewMode('continuous');
  });
  await page.waitForTimeout(600);

  // 5. Test Tools with Active Document Loaded
  console.log('🛠️ Testing Active Document Tools (Bates, Watermark, Sanitize, Compress)...');
  const docTools = ['watermark', 'bates', 'sanitize', 'compress', 'split'];
  for (const tool of docTools) {
    process.stdout.write(`   Testing active doc tool: [${tool}] ... `);
    const beforeErrorCount = pageErrors.length;
    
    await page.evaluate(async (t) => {
      const { useUIStore } = await import('/src/stores/uiStore.ts');
      useUIStore.getState().setActiveModal(t);
    }, tool);
    await page.waitForTimeout(600);

    const newErrors = pageErrors.length - beforeErrorCount;
    if (newErrors > 0) {
      console.log(`❌ FAILED! (${newErrors} errors)`);
    } else {
      console.log(`✓ OK`);
    }

    // Close
    await page.evaluate(async () => {
      const { useUIStore } = await import('/src/stores/uiStore.ts');
      useUIStore.getState().setActiveModal(null);
    });
    await page.waitForTimeout(200);
  }

  // Summary Report
  console.log('\n==========================================');
  console.log('🏁 VIEWER & DOCUMENT AUDIT SUMMARY');
  console.log('==========================================');
  console.log(`Total Page Errors: ${pageErrors.length}`);
  console.log(`Total Console Errors: ${consoleErrors.length}`);
  if (pageErrors.length > 0) {
    console.log('\nPage Errors:');
    pageErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }
  await browser.close();
  console.log('==========================================\n');

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
