/**
 * Mobile UI smoke-check for JustPDFCraft (runs against `vite preview`).
 * Emulates a touch phone, audits tap-target sizes, clicks every mobile
 * control, loads a real PDF, then exercises the editor dock + HUD.
 * Also opens the desktop viewport once to verify toolbar dropdown menus
 * are not clipped by the horizontally-scrollable toolbar.
 *
 * Usage:  node scripts/mobile-ui-check.mjs [url=http://localhost:4173]
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const URL = process.argv[2] || 'http://localhost:4173';
const results = { consoleErrors: [], pageErrors: [], taps: [], notes: [], smallTargets: {} };
const ok = (m) => results.notes.push('✅ ' + m);
const warn = (m) => results.notes.push('⚠️  ' + m);

/* ---------- a valid 1-page minimal PDF (correct xref) ---------- */
function buildTestPdf() {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 6 0 R >> >> >>',
    '<< /Length 44 >>\nstream\nBT /F1 24 Tf 72 720 Td (JustPDFCraft) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length 50 >>\nstream\nBT /F1 24 Tf 72 720 Td (Page Two Test) Tj ET\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return pdf;
}

/* ---------- helpers ---------- */
async function auditTapTargets(page, label) {
  return page.evaluate((lbl) => {
    const out = [];
    const els = document.querySelectorAll('button, [role="button"], a[href], select');
    for (const el of els) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue;
      const min = Math.min(r.width, r.height);
      if (min < 40) {
        out.push({
          label: lbl,
          text: (el.getAttribute('aria-label') || el.title || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    }
    return out;
  }, label);
}

async function clickAndListen(page, locator, name) {
  try {
    await locator.click({ timeout: 4000, force: false });
    results.taps.push(`✅ tapped: ${name}`);
    return true;
  } catch (e) {
    results.taps.push(`❌ FAILED tap: ${name} → ${String(e.message).split('\n')[0]}`);
    return false;
  }
}

async function overlayCount(page) {
  return page.evaluate(() => document.querySelectorAll('div[role="dialog"], div.fixed.inset-0.z-50').length);
}

async function closeOverlays(page) {
  for (let i = 0; i < 4; i++) {
    if ((await overlayCount(page)) === 0) return true;
    const closeBtn = page.locator('button[aria-label="Close"], button[title="Close"]').last();
    if ((await closeBtn.count()) && (await closeBtn.first().isVisible().catch(() => false))) {
      await closeBtn.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }
    const dlg = page.locator('div[role="dialog"]').last();
    if (await dlg.count()) {
      await dlg.locator('button').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }
    await page.evaluate(() => document.querySelectorAll('div.fixed.inset-0.z-50').forEach((d) => d.click()));
    await page.waitForTimeout(400);
  }
  return (await overlayCount(page)) === 0;
}

/* ---------- main ---------- */
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error' && !/favicon|fonts\.g|googleapis|404|net::/.test(msg.text()))
    results.consoleErrors.push(msg.text().slice(0, 300));
});
page.on('pageerror', (err) => results.pageErrors.push(String(err).slice(0, 300)));

console.log(`Opening ${URL} at iPhone 13 emulation (390×844, touch, DPR3)...`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);

/* ---- 1. Home view ---- */
const navHome = page.locator('nav[aria-label="Mobile Navigation"]');
(await navHome.count()) === 1 && (await navHome.isVisible())
  ? ok('home MobileBottomBar visible')
  : warn('home MobileBottomBar NOT visible');

const hs = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
hs <= 2 ? ok(`no horizontal scroll on home (delta=${hs}px)`) : warn(`horizontal scroll on home: +${hs}px`);

await clickAndListen(page, navHome.locator('button[aria-label="Home Dashboard"]').first(), 'Home');
await clickAndListen(page, navHome.locator('button[aria-label="Tools Catalog"]').first(), 'Tools');

// Exam Suite → modal → close
await clickAndListen(page, navHome.locator('button[aria-label="Exam Suite"]').first(), 'Exam Suite');
await page.waitForTimeout(900);
const examOpen = await page.evaluate(() => !!document.querySelector('div[role="dialog"][aria-label="Student Tools Dialog"]'));
examOpen ? ok('Exam Suite modal opens (and is reachable from the bottom bar)') : warn('Exam Suite modal did NOT open');
await closeOverlays(page);

// Search → command palette
await clickAndListen(page, navHome.locator('button[aria-label="Search / Command Palette"]').first(), 'Search');
await page.waitForTimeout(700);
const paletteOpen = await page.evaluate(() => document.body.innerText.length > 0 && (async () => true)());
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// center (+) upload button → file chooser
let filechooserCaught = false;
page.once('filechooser', () => { filechooserCaught = true; });
await clickAndListen(page, page.locator('button[aria-label="Open or Upload File"]').first(), 'center (+) upload');
await page.waitForTimeout(900);
filechooserCaught ? ok('mobile (+) button opens the upload file-picker') : warn('mobile (+) button did NOT open file-picker');
page.removeAllListeners('filechooser');

const badHome = await auditTapTargets(page, 'home');
results.smallTargets['home'] = badHome;

/* ---- 2. Open a real PDF ---- */
const pdfPath = path.join(os.tmpdir(), 'justpdfcraft-mobile-test.pdf');
writeFileSync(pdfPath, buildTestPdf());
await page.locator('input[type="file"]').first().setInputFiles(pdfPath);
await page.waitForTimeout(4500);

const editorMode = await page.evaluate(() => !!document.querySelector('nav[aria-label="Mobile PDF Tool Dock"]'));
editorMode ? ok('PDF loaded → editor dock (bottom bar swap) active') : warn('PDF did NOT open (editor dock missing)');

/* ---- 3. Page stepper + zoom + grid (floating HUD) ---- */
const hud = page.locator('div.fixed.bottom-\\[58px\\]');
const hCount = await hud.count();
hCount > 0 ? ok('floating page/zoom HUD present') : warn('floating HUD NOT found');

await clickAndListen(page, page.locator('button[aria-label="Next Page"]').first(), 'HUD Next Page');
await clickAndListen(page, page.locator('button[aria-label="Previous Page"]').first(), 'HUD Previous Page');
await clickAndListen(page, page.locator('button[title="Zoom In"]').first(), 'HUD Zoom In');
await clickAndListen(page, page.locator('button[title="Zoom Out"]').first(), 'HUD Zoom Out');
await clickAndListen(page, page.locator('button[title="Reset Zoom to Fit Width"]').first(), 'HUD Zoom reset');
await clickAndListen(page, page.locator('button[title="Organize Page Grid"]').first(), 'Grid (organize) toggle');
await page.waitForTimeout(1000);
const organizeVisible = await page.evaluate(() => !!document.querySelector('#organizer-page-0'));
organizeVisible ? ok('Organize (page grid) view renders with thumbnail') : warn('PageOrganizer view did NOT render');
// per-page controls should now be VISIBLE on touch (fix: no hover-only)
const orgControls = await page.evaluate(() => {
  const row = document.querySelector('#organizer-page-0')?.querySelectorAll('button');
  if (!row || !row.length) return null;
  const r = row[0].getBoundingClientRect();
  return { count: row.length, visible: r.width > 0 && r.height > 0, h: Math.round(r.height) };
});
orgControls && orgControls.visible
  ? ok(`PageOrganizer per-page controls visible on touch without hover (${orgControls.count} buttons, first ${orgControls.h}px tall)`)
  : warn('PageOrganizer per-page controls NOT visible on touch');
await clickAndListen(page, page.locator('button[title="Back to Reader"]').first(), 'Back to Reader');
await page.waitForTimeout(1000);

/* ---- 4. Mobile tool dock ---- */
const dock = page.locator('nav[aria-label="Mobile PDF Tool Dock"]');
(await dock.count()) === 1 && (await dock.isVisible()) ? ok('Mobile tool dock visible') : warn('Mobile tool dock NOT visible');

const tools = [
  ['Pan tool', 'Pan / Scroll Mode'],
  ['Edit text', 'Edit Existing Text in PDF'],
  ['Pen draw', 'Pen / Freehand Draw'],
  ['Highlighter', 'Highlighter'],
  ['Add Text', 'Add Text'],
  ['Pan (reset)', 'Pan / Scroll Mode'],
];
for (const [name, title] of tools) {
  await clickAndListen(page, dock.locator(`button[title="${title}"]`).first(), name);
  await page.waitForTimeout(300);
}

await clickAndListen(page, dock.locator('button[title="Sign Document"]').first(), 'Sign (modal)');
await page.waitForTimeout(1000);
const anyDialog = await page.evaluate(() => document.querySelectorAll('div[role="dialog"]').length);
anyDialog > 0 ? ok('Sign modal opens from dock') : warn('Sign modal did NOT open');
await closeOverlays(page);

await clickAndListen(page, dock.locator('button[title^="More PDF Tools"]').first(), 'More Tools sheet');
await page.waitForTimeout(800);
const sheetOpen = await page.evaluate(() => !!document.querySelector('div[role="dialog"][aria-label="More PDF Tools"]'));
sheetOpen ? ok('More-Tools bottom sheet opens') : warn('More-Tools bottom sheet did NOT open');
await clickAndListen(page, page.getByRole('button', { name: 'Compress PDF', exact: false }).first(), 'Compress utility');
await page.waitForTimeout(1200);
const compressOpen = await page.evaluate(() => document.querySelectorAll('div[role="dialog"]').length > 0);
compressOpen ? ok('Compress dialog opens from sheet') : warn('Compress dialog did NOT open');
await closeOverlays(page);

const badEditor = await auditTapTargets(page, 'editor');
results.smallTargets['editor'] = badEditor;
const closed = await closeOverlays(page);
if (!closed) warn('an overlay resisted programmatic dismissal');

/* ---- 5. Save funnel on mobile (fallback download path) ---- */
await clickAndListen(page, page.locator('button[title="Save Document"]').first(), 'Save Document (header)');
await page.waitForTimeout(1500);

/* ---- 6. Desktop viewport: toolbar dropdown not clipped? ---- */
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(1500);
const dropdownCheck = await page.evaluate(() => {
  const tb = Array.from(document.querySelectorAll('div.h-11')).find((d) => d.querySelector('button'));
  if (!tb) return { err: 'toolbar not found' };
  const btn = Array.from(tb.querySelectorAll('button')).find((b) => /shapes/i.test(b.title || ''));
  if (!btn) return { err: 'shapes button not found' };
  btn.click();
  return { clicked: true, toolbarOverflow: getComputedStyle(tb).overflowX + '/' + getComputedStyle(tb).overflowY };
});
await page.waitForTimeout(700);
const menuBox = await page.evaluate(() => {
  // after click, the shapes menu (w-44) should be in DOM and on-screen
  const menus = Array.from(document.querySelectorAll('div.absolute')).filter(
    (d) => getComputedStyle(d).display !== 'none' && Math.round(d.getBoundingClientRect().width) > 100
  );
  if (!menus.length) return { err: 'no dropdown menu visible after clicking shapes' };
  const m = menus[menus.length - 1].getBoundingClientRect();
  const atPoint = document.elementFromPoint(m.left + m.width / 2, m.top + 10);
  return { w: Math.round(m.width), h: Math.round(m.height), top: Math.round(m.top), visibleAtPoint: !!atPoint };
});
results.notes.push(
  dropdownCheck.err
    ? 'ℹ️ desktop dropdown check: ' + dropdownCheck.err
    : `ℹ️ desktop dropdown: toolbar overflow=${dropdownCheck.toolbarOverflow}, menu box=${JSON.stringify(menuBox)}`
);
await page.keyboard.press('Escape');

/* ---- report ---- */
console.log('\n================ RESULTS ================');
console.log('\n[Notes]');
results.notes.forEach((n) => console.log('  ' + n));
console.log('\n[Taps]');
results.taps.forEach((t) => console.log('  ' + t));
for (const [view, list] of Object.entries(results.smallTargets)) {
  console.log(`\n[Small tap-targets (<40px) on ${view}: ${list.length}]`);
  list.slice(0, 12).forEach((b) => console.log(`  ▸ ${b.w}×${b.h}  "${b.text}"`));
}
console.log(`\n[Console errors: ${results.consoleErrors.length}]`);
results.consoleErrors.slice(0, 12).forEach((e) => console.log('  ▸ ' + e));
console.log(`[Page errors: ${results.pageErrors.length}]`);
results.pageErrors.slice(0, 12).forEach((e) => console.log('  ▸ ' + e));
await browser.close();
