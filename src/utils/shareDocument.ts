import { getPDFEngine } from '@core/pdf/engine.factory';

export type ShareResult = 'shared' | 'cancelled' | 'unsupported' | 'error';

/** True when the browser exposes the Web Share API (Android Chrome, iOS Safari, desktop Edge/Chrome). */
export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Serialize the current in-memory PDF and hand it to the native share sheet.
 * Uses the live engine bytes so unsaved edits are included in the shared file.
 */
export async function sharePdfDocument(documentId: string, fileName: string): Promise<ShareResult> {
  if (!isShareSupported()) return 'unsupported';

  try {
    const engine = getPDFEngine();
    const bytes = await engine.saveDocument(documentId);
    const file = new File([bytes as any], fileName || 'document.pdf', {
      type: 'application/pdf',
    });

    const canShareFiles =
      typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

    if (!canShareFiles) {
      // Share sheet exists but cannot carry files (rare on modern browsers) —
      // surface guidance instead of silently sharing a useless link.
      return 'unsupported';
    }

    await navigator.share({
      files: [file],
      title: fileName || 'Document.pdf',
      text: 'Shared from JustPDFCraft — 100% private, in-browser PDF tools.',
    });
    return 'shared';
  } catch (err: any) {
    // User dismissed the native sheet — not an error.
    if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') return 'cancelled';
    return 'error';
  }
}
