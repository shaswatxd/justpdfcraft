export function createPdfBlob(bytes: Uint8Array | ArrayBuffer): Blob {
  return new Blob([bytes as any], { type: 'application/pdf' });
}
