import { createZip } from './zip';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface DocxParagraph {
  text: string;
  isHeading?: boolean;
  headingLevel?: 1 | 2 | 3;
  bold?: boolean;
  italic?: boolean;
  fontSizePt?: number;
  align?: 'left' | 'center' | 'right' | 'both';
  pageBreakAfter?: boolean;
}

/**
 * Creates a valid, zero-dependency Microsoft Word (.docx) document from paragraphs.
 */
export function createDocx(
  paragraphs: (string | DocxParagraph)[],
  options: { title?: string } = {}
): Uint8Array {
  const enc = new TextEncoder();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // 3. word/document.xml
  const pXmlList: string[] = [];

  // Optional Title heading
  if (options.title) {
    pXmlList.push(`    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
          <w:szCs w:val="48"/>
          <w:color w:val="1E293B"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(options.title)}</w:t>
      </w:r>
    </w:p>`);
  }

  for (const item of paragraphs) {
    const p: DocxParagraph = typeof item === 'string' ? { text: item } : item;
    const cleanText = escapeXml(p.text || '');

    const pPrParts: string[] = [];
    if (p.align) {
      pPrParts.push(`<w:jc w:val="${p.align}"/>`);
    }

    if (p.isHeading) {
      const sz = p.headingLevel === 1 ? '36' : p.headingLevel === 2 ? '30' : '26';
      pPrParts.push(`<w:spacing w:before="200" w:after="100"/>`);
      pXmlList.push(`    <w:p>
      <w:pPr>${pPrParts.join('')}</w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="${sz}"/>
          <w:szCs w:val="${sz}"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t xml:space="preserve">${cleanText}</w:t>
      </w:r>
      ${p.pageBreakAfter ? '<w:r><w:br w:type="page"/></w:r>' : ''}
    </w:p>`);
    } else {
      const rPrParts: string[] = [];
      if (p.bold) rPrParts.push('<w:b/>');
      if (p.italic) rPrParts.push('<w:i/>');
      if (p.fontSizePt) {
        const halfPt = Math.round(p.fontSizePt * 2);
        rPrParts.push(`<w:sz w:val="${halfPt}"/><w:szCs w:val="${halfPt}"/>`);
      }

      pPrParts.push(`<w:spacing w:after="140" w:line="276" w:lineRule="auto"/>`);

      pXmlList.push(`    <w:p>
      <w:pPr>${pPrParts.join('')}</w:pPr>
      <w:r>
        ${rPrParts.length > 0 ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : ''}
        <w:t xml:space="preserve">${cleanText}</w:t>
      </w:r>
      ${p.pageBreakAfter ? '<w:r><w:br w:type="page"/></w:r>' : ''}
    </w:p>`);
    }
  }

  // A4 dimensions in twentieths of a point (dxa):
  // 210mm x 297mm -> 11906 x 16838 dxa (1 inch = 1440 dxa)
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${pXmlList.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return createZip([
    { name: '[Content_Types].xml', data: enc.encode(contentTypesXml) },
    { name: '_rels/.rels', data: enc.encode(rootRelsXml) },
    { name: 'word/document.xml', data: enc.encode(documentXml) },
  ]);
}
