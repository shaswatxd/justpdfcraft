import { getPDFEngine } from './engine.factory';
import { PDFEngine, TextItem } from './engine.interface';

export interface ExtractedTableData {
  rows: string[][];
  csv: string;
  tsv: string;
  rowCount: number;
  colCount: number;
}

/**
 * Clusters extracted text items into a structured 2D table grid.
 * Analyzes vertical baseline alignment (Y-axis) for rows and horizontal (X-axis) alignment for columns.
 */
export async function extractTableFromPage(
  documentId: string,
  pageIndex: number,
  toleranceY: number = 6,
  customEngine?: PDFEngine
): Promise<ExtractedTableData> {
  const engine = customEngine || getPDFEngine();
  const textContent = await engine.extractPageText(documentId, pageIndex);
  const items: TextItem[] = textContent.items || [];

  if (items.length === 0) {
    return {
      rows: [],
      csv: '',
      tsv: '',
      rowCount: 0,
      colCount: 0,
    };
  }

  // 1. Group items into rows by Y-coordinate
  // Note: PDF coordinate Y goes bottom-to-top or top-to-bottom depending on extraction.
  // Items with abs(y1 - y2) <= toleranceY are on the same row.
  const rowBuckets: Array<{ y: number; items: TextItem[] }> = [];

  for (const item of items) {
    const textVal = (item.str || (item as any).text || '').trim();
    if (!textVal) continue;

    let matchedBucket = rowBuckets.find((b) => Math.abs(b.y - item.y) <= toleranceY);
    if (matchedBucket) {
      matchedBucket.items.push(item);
      // Update running average Y
      matchedBucket.y = (matchedBucket.y + item.y) / 2;
    } else {
      rowBuckets.push({ y: item.y, items: [item] });
    }
  }

  // Sort rows from top to bottom
  rowBuckets.sort((a, b) => b.y - a.y);

  // 2. Discover unique column boundary clusters across all rows
  const allXCoords: number[] = [];
  for (const bucket of rowBuckets) {
    for (const item of bucket.items) {
      allXCoords.push(item.x);
    }
  }
  allXCoords.sort((a, b) => a - b);

  // Cluster X coordinates with column tolerance (e.g. 18 points)
  const columnTolerance = 18;
  const colCenters: number[] = [];
  for (const x of allXCoords) {
    const existing = colCenters.find((c) => Math.abs(c - x) <= columnTolerance);
    if (!existing) {
      colCenters.push(x);
    }
  }
  colCenters.sort((a, b) => a - b);

  const numCols = Math.max(1, colCenters.length);

  // 3. Build 2D string grid
  const rows: string[][] = [];

  for (const bucket of rowBuckets) {
    const rowCells: string[] = new Array(numCols).fill('');
    // Sort items in this row left to right
    bucket.items.sort((a, b) => a.x - b.x);

    for (const item of bucket.items) {
      const cellText = (item.str || (item as any).text || '').trim();
      if (!cellText) continue;

      // Find closest column center
      let closestColIdx = 0;
      let minDistance = Infinity;
      for (let c = 0; c < colCenters.length; c++) {
        const dist = Math.abs(item.x - colCenters[c]);
        if (dist < minDistance) {
          minDistance = dist;
          closestColIdx = c;
        }
      }

      if (rowCells[closestColIdx]) {
        rowCells[closestColIdx] += ' ' + cellText;
      } else {
        rowCells[closestColIdx] = cellText;
      }
    }

    // Only add row if at least one cell has content
    if (rowCells.some((c) => c.length > 0)) {
      rows.push(rowCells);
    }
  }

  // Filter out any columns that are completely empty across all rows
  const activeColIndices: number[] = [];
  for (let c = 0; c < numCols; c++) {
    const hasData = rows.some((r) => r[c] && r[c].trim().length > 0);
    if (hasData) {
      activeColIndices.push(c);
    }
  }

  const prunedRows = rows.map((r) => activeColIndices.map((colIdx) => r[colIdx] || ''));

  // 4. Generate CSV string
  const csvLines = prunedRows.map((r) =>
    r
      .map((cell) => {
        const escaped = cell.replace(/"/g, '""');
        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
          return `"${escaped}"`;
        }
        return escaped;
      })
      .join(',')
  );
  const csv = csvLines.join('\n');

  // 5. Generate TSV string (for direct clipboard paste into Excel/Google Sheets)
  const tsvLines = prunedRows.map((r) =>
    r
      .map((cell) => {
        return cell.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
      })
      .join('\t')
  );
  const tsv = tsvLines.join('\n');

  return {
    rows: prunedRows,
    csv,
    tsv,
    rowCount: prunedRows.length,
    colCount: activeColIndices.length,
  };
}

/**
 * Extracts and combines tables across multiple pages into a consolidated table structure.
 */
export async function extractTableFromPages(
  documentId: string,
  pageIndices: number[],
  toleranceY: number = 6,
  customEngine?: PDFEngine
): Promise<ExtractedTableData> {
  const allRows: string[][] = [];
  let maxCols = 0;

  for (const pageIdx of pageIndices) {
    const pageTable = await extractTableFromPage(documentId, pageIdx, toleranceY, customEngine);
    if (pageTable.rows.length > 0) {
      if (pageIndices.length > 1) {
        allRows.push([`--- Page ${pageIdx + 1} ---`]);
      }
      for (const r of pageTable.rows) {
        allRows.push(r);
        if (r.length > maxCols) maxCols = r.length;
      }
    }
  }

  const normalizedRows = allRows.map((r) => {
    if (r.length < maxCols) {
      return [...r, ...new Array(maxCols - r.length).fill('')];
    }
    return r;
  });

  const csv = normalizedRows
    .map((r) =>
      r
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
            return `"${escaped}"`;
          }
          return escaped;
        })
        .join(',')
    )
    .join('\n');

  const tsv = normalizedRows
    .map((r) =>
      r
        .map((cell) => cell.replace(/\t/g, ' ').replace(/\r?\n/g, ' '))
        .join('\t')
    )
    .join('\n');

  return {
    rows: normalizedRows,
    csv,
    tsv,
    rowCount: normalizedRows.length,
    colCount: maxCols,
  };
}
