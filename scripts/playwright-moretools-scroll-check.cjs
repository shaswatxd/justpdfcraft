/**
 * Regression check: tool menus stay open while scrolling their lists.
 *
 * - >= md (768px) viewports: the viewer "More Tools" portal dropdown must stay
 *   open and scroll its list (the capture-phase scroll-close listener in
 *   MainToolbar must ignore events originating inside [data-toolbar-portal]).
 * - < md viewports (phones): the MobileEditorToolbar "More PDF Tools" bottom
 *   sheet must open and close cleanly, wheel-scrolling inside it must not
 *   dismiss it.
 *
 * Runs against the BUILT app on vite preview (port 1420).
 * Exit code = number of failures.
 */
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
    req.setTimeout(1200, () => { req.destroy(); resolve(false); });
  });
}

async function samplePdfBytes() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`More Tools Scroll Audit - Page ${i}`, { x: 50, y: 800, size: 20, font, color: rgb(0.1, 0.2, 0.8) });
  }
  return Array.from(await doc.save());
}

async function openEditorWithSampleDoc(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  const pdfBytes = await samplePdfBytes();
  await page.evaluate(async (bytes) => {
    await window.__JUSTPDFCRAFT_DOC_STORE__.getState().loadDocument(new Uint8Array(bytes), 'MoreToolsScrollAudit.pdf');
    window.__JUSTPDFCRAFT_UI_STORE__.getState().setActiveView('editor');
  }, pdfBytes);
}

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'mobile-360x800', width: 360, height: 800 },
];

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'msedge' }));
  const failures = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: vp.width < 768 });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    try {
      await openEditorWithSampleDoc(page);

      if (vp.width >= 768) {
        await page.waitForSelector('canvas', { timeout: 20000 });
        const moreBtn = page.locator('button[title="More Professional Tools"]').first();
        await page.evaluate(() => {
          document.querySelector('button[title="More Professional Tools"]')?.scrollIntoView({ block: 'nearest', inline: 'end' });
        });
        await page.waitForTimeout(150);
        await moreBtn.click({ force: true, timeout: 10000 });
        await page.waitForSelector('[data-toolbar-portal]', { timeout: 5000 });
        const portal = page.locator('[data-toolbar-portal]').first();

        // 1. Menu must fit inside the viewport (flip-up logic)
        const box = await portal.boundingBox();
        if (box && (box.y < 0 || box.y + box.height > vp.height + 1)) {
          failures.push(`${vp.name}: menu outside viewport (y=${box.y}, h=${box.height})`);
        }

        // 2. Wheel-scrolling inside the menu must NOT close it and must scroll the list
        await portal.hover();
        const before = await portal.evaluate((el) => el.scrollTop);
        for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60); }
        const stillOpen = (await portal.count()) > 0;
        const after = await portal.evaluate((el) => el.scrollTop);
        if (!stillOpen) failures.push(`${vp.name}: menu CLOSED while scrolling inside it (regression)`);
        else if (!(after > before)) failures.push(`${vp.name}: list did not scroll (scrollTop ${before} -> ${after})`);
        else console.log(`✅ ${vp.name}: dropdown stays open + scrolls (scrollTop ${before} → ${after})`);

        // 3. Wheel INSIDE the list must not scroll the page behind it
        const pageScroll = await page.evaluate(() => window.scrollY);
        if (pageScroll !== 0) failures.push(`${vp.name}: page scrolled while wheeling inside menu (scrollY=${pageScroll})`);
      } else {
        // Phones: MobileEditorToolbar bottom dock -> "More PDF Tools" sheet
        await page.waitForSelector('[data-testid="mobile-editor-hud"]', { timeout: 20000 });
        const toolsBtn = page.locator('button[title^="More PDF Tools"]').first();
        await toolsBtn.click({ force: true, timeout: 10000 });
        const sheet = page.locator('[role="dialog"][aria-label="More PDF Tools"]');
        await sheet.waitFor({ state: 'visible', timeout: 5000 });
        await sheet.hover().catch(() => {});
        for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60); }
        if ((await sheet.count()) === 0) failures.push(`${vp.name}: mobile Tools sheet closed on wheel`);
        else console.log(`✅ ${vp.name}: mobile Tools sheet stays open`);
        await page.locator('[role="dialog"][aria-label="More PDF Tools"] button').first().click({ timeout: 5000 }); // close via first header button (X)
      }

      if (pageErrors.length) failures.push(`${vp.name}: page errors: ${pageErrors.slice(0, 3).join(' | ')}`);
    } catch (err) {
      failures.push(`${vp.name}: ${err.message.split('\n')[0]}`);
    }
    await ctx.close();
  }

  await browser.close();
  if (failures.length) {
    console.error('❌ FAILURES:\n' + failures.map((f) => ` - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('✅ More Tools scroll regression check passed');
})();
