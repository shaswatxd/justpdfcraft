/**
 * Safe cross-browser download utilities for JustPDFCraft.
 * Ensures the anchor is appended to the DOM before clicking (required by Firefox)
 * and defers URL.revokeObjectURL to avoid race-condition download cancellations.
 */

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadText(text: string, fileName: string, mimeType: string = 'text/plain;charset=utf-8;'): void {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, fileName);
}
