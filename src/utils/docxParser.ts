/**
 * Lightweight Word (.docx) document text parser.
 * Reads word/document.xml to extract paragraphs.
 */
import JSZip from 'jszip';

export async function parseDocx(buffer: ArrayBuffer | Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file('word/document.xml');

  if (!docFile) {
    throw new Error('Invalid Word document: word/document.xml not found.');
  }

  const xmlText = await docFile.async('text');
  const paragraphs: string[] = [];
  const pMatches = xmlText.match(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi) || [];

  for (const pXml of pMatches) {
    const tMatches = Array.from(pXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)).map((m) => m[1]);
    const cleanText = tMatches
      .join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    if (cleanText.trim()) {
      paragraphs.push(cleanText.trim());
    }
  }

  return paragraphs;
}
