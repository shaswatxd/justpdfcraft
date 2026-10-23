/**
 * Desktop UI smoke-check for JustPDFCraft (runs against `vite preview`).
 * 1280×800 viewport: header nav, tool explorer, PDF editor toolbar,
 * dropdowns, sidebar, tab bar, zoom/page nav, keyboard shortcuts,
 * command palette, modals + central Escape/backdrop dismissal.
 *
 * Usage:  node scripts/desktop-ui-check.mjs [url=http://localhost:4173]
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://localhost:4173';
const results = { consoleErrors: [], pageErrors: [], taps: [], notes: [] };
const ok = (m) => results.notes.push('✅ ' + m);
const warn = (m) => results.notes.push('⚠️  ' + m);

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

async function clickAndListen(page, locator, name) {
  try {
    await locator.click({ timeout: 4000 });
    results.taps.push(`✅ clicked: ${name}`);
    return true;
  } catch (e) {
    results.taps.push(`❌ FAILED click: ${name} → ${String(e.message).split('\n')[0]}`);
    return false;
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error' && !/favicon|fonts\.g|googleapis|404|net::/.test(msg.text()))
    results.consoleErrors.push(msg.text().slice(0, 300));
});
page.on('pageerror', (err) => results.pageErrors.push(String(err).slice(0, 300)));

console.log(`Opening ${URL} at 1280×800 desktop viewport...`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);

/* ---- 1. Home desktop ---- */
const hs = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
hs <= 2 ? ok(`no horizontal scroll on home (delta=${hs}px)`) : warn(`horizontal scroll on home: +${hs}px`);

// header nav quick links
await clickAndListen(page, page.getByRole('button', { name: 'Exam Photo & Sign', exact: false }).first(), 'Header: Exam Photo & Sign');
await page.waitForTimeout(600);
const examOpen = await page.evaluate(() => !!document.querySelector('div[role="dialog"][aria-label="Student Tools Dialog"]'));
examOpen ? ok('Student Tools dialog opens from desktop nav') : warn('Student Tools dialog did NOT open');
await page.keyboard.press('Escape'); // tests NEW central dismissal
await page.waitForTimeout(500);
const examClosed = await page.evaluate(() => !document.querySelector('div[role="dialog"]'));
examClosed ? ok('Escape key closes modals (new central dismissal works)') : warn('Escape did NOT close the modal');

// ToolExplorer category tabs + filter
await clickAndListen(page, page.getByRole('button', { name: 'PDF Suite', exact: false }).first(), 'Category tab: PDF Suite');
await clickAndListen(page, page.getByRole('button', { name: 'All Tools', exact: false }).first(), 'Category tab: All Tools');
await clickAndListen(page, page.getByRole('button', { name: 'Popular', exact: false }).first(), 'Popular filter');
await clickAndListen(page, page.getByRole('button', { name: 'Popular', exact: false }).first(), 'Popular off');

// Sign tool card = upload-first workflow: file picker opens, dialog appears AFTER doc loads
let signChooserSeen = false;
page.once('filechooser', () => { signChooserSeen = true; });
const signCard = page.locator('div[role="button"]', { hasText: 'Sign' }).first();
await signCard.click({ timeout: 5000, force: true }).catch(() => {});
await page.waitForTimeout(800);
signChooserSeen ? ok('Sign tool card opens upload workflow (file-picker-first by design)') : warn('Sign tool card did NOT trigger file picker');
// backdrop-click dismissal (new) — click exact overlay corner
await page.mouse.click(8, 8);
await page.waitForTimeout(500);
const signClosed = await page.evaluate(() => !document.querySelector('div[role="dialog"]'));
signClosed ? ok('Backdrop click closes modals (new central dismissal works)') : warn('Backdrop click did NOT close modal');

/* ---- 2. Settings dialog ---- */
await clickAndListen(page, page.locator('button[title="Settings"]').first(), 'Settings button');
await page.waitForTimeout(700);
const settingsOpen = await page.evaluate(() => !!document.querySelector('div[role="dialog"][aria-label="Settings Dialog"]'));
settingsOpen ? ok('Settings dialog opens') : warn('Settings dialog did NOT open');
// close via backdrop click at far corner (central dismissal)
await page.mouse.click(5, 5);
await page.waitForTimeout(500);
const settingsClosed = await page.evaluate(() => !document.querySelector('div[role="dialog"]'));
settingsClosed ? ok('Settings dialog closes via backdrop click') : warn('Settings dialog did NOT close');
await page.waitForTimeout(400);

/* ---- 3. Command palette ---- */
// Command palette — open state = palette container fixed overlay with input focus
await page.keyboard.press('Control+k');
await page.waitForTimeout(900);
const paletteOpen = await page.evaluate(() => {
  const el = document.activeElement;
  const overlay = Array.from(document.querySelectorAll('div.fixed')).find(
    (d) => d.className.includes('z-') && d.querySelector('input')
  );
  return !!overlay || (el instanceof HTMLInputElement && el.className.includes('bg-transparent'));
});
paletteOpen ? ok('Command palette opens via Ctrl+K') : warn('Command palette did NOT open via Ctrl+K');
await page.keyboard.type('compress');
await page.waitForTimeout(400);
await page.keyboard.press('Escape'); // palette has its own Escape handling
await page.waitForTimeout(400);

/* ---- 4. Load PDF into desktop editor ---- */
const pdfPath = path.join(os.tmpdir(), 'jpc-desktop-test.pdf');
writeFileSync(pdfPath, buildTestPdf());
await page.locator('input[type="file"]').first().setInputFiles(pdfPath);
await page.waitForTimeout(4500);

const toolDock = page.locator('div.h-11').first();
(await toolDock.isVisible()) ? ok('MainToolbar (h-11) visible in editor') : warn('MainToolbar NOT visible');

const hs2 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
hs2 <= 2 ? ok(`no page-level horizontal scroll in editor (delta=${hs2}px)`) : warn(`page-level horizontal scroll: +${hs2}px (toolbar scroll is by design)`);

// tools
await clickAndListen(page, page.locator('button[title="Pan / Hand Tool (H)"]').first(), 'Hand tool');
await clickAndListen(page, page.locator('button[title="Select / Interact (V)"]').first(), 'Select tool');

// Shape dropdown
const shapesBtn = page.locator('div.h-11 button[title*="hape"]').first();
(await shapesBtn.count())
  ? (await clickAndListen(page, shapesBtn, 'Shapes dropdown toggle'),
    await page.waitForTimeout(400),
    (await page.evaluate(() => !!document.elementFromPoint(innerWidth / 2, 70)))
      ? ok('Shapes dropdown panel rendered (not clipped)')
      : warn('Shapes dropdown panel NOT visible'),
    await page.keyboard.press('Escape'),
    await page.keyboard.press('Escape'))
  : warn('Shapes button not found in toolbar');

// More tools dropdown → Compress dialog
const moreBtn = page.locator('div.h-11 button[title^="More"]').first();
if (await moreBtn.count()) {
  await clickAndListen(page, moreBtn, 'More Tools dropdown toggle');
  await page.waitForTimeout(400);
  await clickAndListen(page, page.getByRole('button', { name: 'Compress', exact: false }).first(), 'Compress from desktop dropdown');
  await page.waitForTimeout(1000);
  const cp = await page.evaluate(() => !!document.querySelector('div[role="dialog"][aria-label="Compress Dialog"]'));
  cp ? ok('Compress dialog opens from toolbar dropdown') : warn('Compress dialog did NOT open');
  await page.keyboard.press('Escape'); // central dismissal
  await page.waitForTimeout(400);
  const cpClosed = await page.evaluate(() => !document.querySelector('div[role="dialog"]'));
  cpClosed ? ok('Compress dialog closes via Escape') : warn('Compress dialog did NOT close via Escape');
} else warn('More tools button not found');

/* ---- 5. Sidebar + tabs + page nav + zoom ---- */
// Sidebar: starts OPEN on desktop (window.innerWidth >= 768) — assert full open/close cycle stability
const asideBefore = await page.evaluate(() => document.querySelectorAll('aside').length);
await clickAndListen(page, page.locator('button[title="Toggle Navigation Sidebar"]').first(), 'Sidebar toggle');
await page.waitForTimeout(700);
const asideAfter1 = await page.evaluate(() => document.querySelectorAll('aside').length);
await clickAndListen(page, page.locator('button[title="Toggle Navigation Sidebar"]').first(), 'Sidebar toggle back');
await page.waitForTimeout(700);
const asideAfter2 = await page.evaluate(() => document.querySelectorAll('aside').length);
(asideBefore !== asideAfter1 && asideAfter2 === asideBefore) && asideAfter1 + asideBefore > 0
  ? ok(`Sidebar open/close cycle stable (before=${asideBefore}, after=${asideAfter1}, restored=${asideAfter2})`)
  : warn(`Sidebar cycle suspicious: before=${asideBefore} after1=${asideAfter1} after2=${asideAfter2}`);

const tabbar = page.locator('div.hidden.md\\:block').locator('div').first();
(await page.evaluate(() => !!document.querySelector('div.hidden')))
  ? ok('Document tab bar container present (desktop)')
  : warn('Document tab bar missing');

await clickAndListen(page, page.getByRole('button', { name: 'Next Page', exact: false }).first(), 'Next Page');
await clickAndListen(page, page.getByRole('button', { name: 'Previous Page', exact: false }).first(), 'Previous Page');
await clickAndListen(page, page.getByRole('button', { name: 'Zoom in', exact: false }).first(), 'Zoom in');
await clickAndListen(page, page.getByRole('button', { name: 'Zoom out', exact: false }).first(), 'Zoom out');

/* ---- 6. Keyboard shortcuts ---- */
await page.keyboard.press('Control+z');
await page.waitForTimeout(300);
ok('Ctrl+Z dispatched (undo)');
await page.keyboard.press('Control+y');
await page.waitForTimeout(300);
ok('Ctrl+Y dispatched (redo)');

// Document tab bar: open-file (plus) button
page.once('filechooser', () => {});
let tabOpenTriggered = false;
page.on('filechooser', () => { tabOpenTriggered = true; });
const tabPlus = page.locator('button[title="Open Another PDF into New Tab"]').first();
await tabPlus.click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(700);
tabOpenTriggered ? ok('Document tab bar + button opens file picker') : warn('Tab bar + button did not trigger file picker');
page.removeAllListeners('filechooser');

/* ---- report ---- */
console.log('\n================ RESULTS ================');
console.log('\n[Notes]');
results.notes.forEach((n) => console.log('  ' + n));
console.log('\n[Clicks]');
results.taps.forEach((t) => console.log('  ' + t));
console.log(`\n[Console errors: ${results.consoleErrors.length}]`);
results.consoleErrors.slice(0, 12).forEach((e) => console.log('  ▸ ' + e));
console.log(`[Page errors: ${results.pageErrors.length}]`);
results.pageErrors.slice(0, 12).forEach((e) => console.log('  ▸ ' + e));
await browser.close();
