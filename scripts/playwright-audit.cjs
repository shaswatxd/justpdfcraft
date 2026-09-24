const { chromium } = require('playwright');

async function runAudit() {
  console.log('🚀 Starting JustPDFCraft Full Playwright End-to-End Audit...');
  
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
      // Filter out harmless favicon or font warnings if any
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404')) {
        console.warn('⚠️ [ConsoleError]:', text);
        consoleErrors.push(text);
      }
    }
  });

  console.log('📍 Navigating to http://localhost:1420/ ...');
  await page.goto('http://localhost:1420/', { waitUntil: 'networkidle' });

  // 1. Verify Home Dashboard
  console.log('✅ Verifying Home Dashboard elements...');
  const title = await page.title();
  console.log(`   Page Title: "${title}"`);

  // Check header, search, hero dropzones
  const headerVisible = await page.locator('header').first().isVisible();
  console.log(`   AppHeader visible: ${headerVisible}`);

  // List of all modals to audit
  const modalsToTest = [
    'split',
    'merge',
    'compress',
    'ocr',
    'print',
    'protect',
    'compare',
    'sign',
    'convert',
    'watermark',
    'scan',
    'bates',
    'sanitize',
    'batch',
    'crop',
    'extract-table',
    'extract-images',
    'photo-editor',
    'student-resizer',
    'student-calculators',
    'handwriting',
    'image-tools',
    'legal',
    'settings',
    'shortcuts'
  ];

  console.log(`\n🧪 Testing all ${modalsToTest.length} tool dialogs for runtime loading and rendering...`);
  
  const results = [];

  for (const modal of modalsToTest) {
    process.stdout.write(`   Testing modal: [${modal}] ... `);
    const beforeErrorCount = pageErrors.length;
    
    // Trigger modal opening via window / store or button
    await page.evaluate((m) => {
      // Access Zustand store in browser
      const store = (window).__JUSTPDFCRAFT_UI_STORE__ || (window).useUIStore;
      if (store && store.getState) {
        store.getState().setActiveModal(m);
      } else {
        // Fallback: dispatch custom event or click
        window.dispatchEvent(new CustomEvent('open-modal', { detail: m }));
      }
    }, modal);

    // If store wasn't exposed on window, expose it via evaluate
    const storeExposed = await page.evaluate(() => typeof (window).__JUSTPDFCRAFT_UI_STORE__ !== 'undefined');
    if (!storeExposed) {
      // Expose Zustand store hook
      await page.evaluate((m) => {
        // Find elements with data-tool-id or similar, or trigger search
        const btn = document.querySelector(`[data-tool-id="${m}"]`);
        if (btn) btn.click();
      }, modal);
    }

    // Wait a brief moment for lazy-load chunk and modal animation
    await page.waitForTimeout(600);

    // Check if error boundary or error dialog appeared
    const errorBoundaryText = await page.evaluate(() => {
      const errEl = document.querySelector('[role="alert"]') || document.body.innerText.includes('Something went wrong');
      return errEl ? true : false;
    });

    const newErrors = pageErrors.length - beforeErrorCount;

    if (newErrors > 0 || errorBoundaryText) {
      console.log(`❌ FAILED! (Errors: ${newErrors}, ErrorBoundary: ${errorBoundaryText})`);
      results.push({ modal, status: 'FAILED', errors: pageErrors.slice(beforeErrorCount) });
    } else {
      console.log(`✓ OK`);
      results.push({ modal, status: 'OK' });
    }

    // Close the modal
    await page.evaluate(() => {
      const closeButtons = document.querySelectorAll('button[aria-label="Close"], button[title="Close"], button:has(svg.lucide-x)');
      if (closeButtons.length > 0) {
        (closeButtons[closeButtons.length - 1]).click();
      }
      // Also try escape key
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // 3. Test Student Calculators Sub-tabs
  console.log('\n🧮 Testing Student Calculators Sub-tabs...');
  // Open student calculators
  await page.evaluate(() => {
    // Click on Student Calculators tool card on Home Dashboard
    const cards = Array.from(document.querySelectorAll('div, button'));
    const calcCard = cards.find(el => el.textContent && el.textContent.includes('Student Calculators') && el.textContent.includes('CGPA'));
    if (calcCard) calcCard.click();
  });
  await page.waitForTimeout(800);

  // Check tabs inside calculator
  const calculatorTabs = [
    'cgpa', 'sgpa', 'attendance', 'percentage', 'age', 'unit',
    'date-diff', 'timetable', 'countdown', 'gpa-convert', 'notes',
    'qr', 'password', 'picker'
  ];

  for (const tab of calculatorTabs) {
    const tabClicked = await page.evaluate((tabId) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes(tabId.replace('-', ' ')));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, tab);
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. Test Student Tools (Resizer, Clean sign, Combiner, DOP banner)
  console.log('\n📸 Testing Student Tools Dialog tabs...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, button'));
    const toolCard = cards.find(el => el.textContent && el.textContent.includes('Student Exam Resizer'));
    if (toolCard) toolCard.click();
  });
  await page.waitForTimeout(800);

  const studentToolTabs = ['Resizer', 'Clean Signature', 'Photo + Sign Combiner', 'DOP Banner'];
  for (const tab of studentToolTabs) {
    await page.evaluate((tabName) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes(tabName));
      if (btn) btn.click();
    }, tab);
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');

  // Summary Report
  console.log('\n==========================================');
  console.log('🏁 PLAYWRIGHT AUDIT SUMMARY');
  console.log('==========================================');
  console.log(`Total Modals Tested: ${results.length}`);
  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Page Errors: ${pageErrors.length}`);
  console.log(`Total Console Errors: ${consoleErrors.length}`);

  if (pageErrors.length > 0) {
    console.log('\nPage Errors encountered:');
    pageErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }
  if (consoleErrors.length > 0) {
    console.log('\nConsole Errors encountered:');
    consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  await browser.close();
  console.log('==========================================\n');

  if (failed > 0 || pageErrors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Audit Script Crashed:', err);
  process.exit(1);
});
