import { createZip } from './zip';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getColumnLetter(colIndex: number): string {
  let temp: number;
  let letter = '';
  let col = colIndex + 1;
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    col = Math.floor((col - temp) / 26);
  }
  return letter;
}

/**
 * Creates a valid, zero-dependency Excel workbook (.xlsx) from a 2D array of string cells.
 */
export function createXlsx(rows: string[][], sheetName = 'Table'): Uint8Array {
  const enc = new TextEncoder();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // 3. xl/_rels/workbook.xml.rels
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  // 4. xl/workbook.xml
  const cleanSheetName = escapeXml(sheetName.slice(0, 31) || 'Sheet1');
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${cleanSheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  // 5. xl/worksheets/sheet1.xml
  let sheetData = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 1;
    let rowCells = '';
    for (let c = 0; c < row.length; c++) {
      const cellValue = row[c] ?? '';
      const cellRef = `${getColumnLetter(c)}${rowNum}`;
      const escaped = escapeXml(cellValue);
      // Use inlineStr for universal formatting preservation without shared strings table
      rowCells += `<c r="${cellRef}" t="inlineStr"><is><t>${escaped}</t></is></c>`;
    }
    sheetData += `<row r="${rowNum}">${rowCells}</row>`;
  }

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetData}</sheetData>
</worksheet>`;

  const files = [
    { name: '[Content_Types].xml', data: enc.encode(contentTypesXml) },
    { name: '_rels/.rels', data: enc.encode(rootRelsXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRelsXml) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet1Xml) },
  ];

  return createZip(files);
}
