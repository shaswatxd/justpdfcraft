/**
 * Lightweight Word (.docx) and PowerPoint (.pptx) document text parser.
 * Reads XML structures from the OpenXML zip archive to extract clean text.
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

export async function parsePptx(buffer: ArrayBuffer | Uint8Array): Promise<string[][]> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f));

  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  });

  const slides: string[][] = [];
  for (const sf of slideFiles) {
    const xml = await zip.files[sf].async('text');
    const matches = Array.from(xml.matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi)).map((m) => m[1]);
    const lines = matches
      .map((m) =>
        m
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim()
      )
      .filter(Boolean);

    if (lines.length > 0) {
      slides.push(lines);
    }
  }

  return slides;
}
