/**
 * Native File System Access API integration for JustPDFCraft
 * Enables direct opening and in-place saving back to the local hard drive.
 */

export interface NativeOpenFileResult {
  file: File;
  handle: FileSystemFileHandle;
  bytes: Uint8Array;
}

/**
 * Checks if the Native File System Access API is supported.
 */
export function isNativeFSSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

/**
 * Prompts the user to pick a PDF file directly from their operating system disk.
 */
export async function openPdfWithNativePicker(): Promise<NativeOpenFileResult | null> {
  if (!isNativeFSSupported()) return null;

  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'PDF Document (*.pdf)',
          accept: { 'application/pdf': ['.pdf'] },
        },
      ],
      multiple: false,
    });

    if (!handle) return null;

    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    return { file, handle, bytes };
  } catch (err: any) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

/**
 * Writes updated PDF binary data directly back into an existing FileSystemFileHandle.
 * Avoids browser download popups and duplicate files.
 */
export async function saveToExistingHandle(
  handle: FileSystemFileHandle,
  bytes: Uint8Array
): Promise<boolean> {
  try {
    if ('queryPermission' in handle) {
      const query = await (handle as any).queryPermission({ mode: 'readwrite' });
      if (query !== 'granted') {
        const req = await (handle as any).requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') return false;
      }
    }

    const writable = await (handle as any).createWritable();
    await writable.write(bytes);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Native save to handle failed:', err);
    return false;
  }
}

/**
 * Prompts the user with a native OS "Save As" file picker and writes the PDF data.
 * Returns the acquired FileSystemFileHandle for subsequent in-place saves.
 */
export async function saveWithNativePicker(
  bytes: Uint8Array,
  suggestedName: string = 'document.pdf'
): Promise<FileSystemFileHandle | null> {
  if (!isNativeFSSupported()) return null;

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'PDF Document (*.pdf)',
          accept: { 'application/pdf': ['.pdf'] },
        },
      ],
    });

    if (!handle) return null;

    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();

    return handle;
  } catch (err: any) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}
