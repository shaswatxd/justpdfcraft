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
