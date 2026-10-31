import { describe, it, expect } from 'vitest';
import { TOOLS_CATALOG, searchTools } from '@/data/toolsCatalog';

describe('Master Tools Catalog (iLovePDF Suite)', () => {
  it('should contain curated authentic PDF tools plus exclusive handwriting generator', () => {
    expect(TOOLS_CATALOG.length).toBe(29);
    expect(TOOLS_CATALOG.some((t) => t.id === 'merge-pdf')).toBe(true);
    expect(TOOLS_CATALOG.some((t) => t.id === 'split-pdf')).toBe(true);
    expect(TOOLS_CATALOG.some((t) => t.id === 'compress-pdf')).toBe(true);
    expect(TOOLS_CATALOG.some((t) => t.id === 'handwriting-generator')).toBe(true);
  });

  it('should search tools accurately by name, description, or keyword tags', () => {
    const compressResults = searchTools('compress');
    expect(compressResults.length).toBeGreaterThan(0);
    expect(compressResults.some((t) => t.id === 'compress-pdf')).toBe(true);

    const resizerResults = searchTools('resizer');
    expect(resizerResults.some((t) => t.id === 'target-kb-resizer')).toBe(true);

    const ocrResults = searchTools('ocr');
    expect(ocrResults.some((t) => t.id === 'ocr-pdf')).toBe(true);

    const hwResults = searchTools('handwriting');
    expect(hwResults.some((t) => t.id === 'handwriting-generator')).toBe(true);
  });

  it('should filter tools by category when category filter is supplied', () => {
    const organizeOnly = searchTools('', 'organize');
    expect(organizeOnly.length).toBeGreaterThan(0);
    expect(organizeOnly.every((t) => t.category === 'organize')).toBe(true);

    const optimizeOnly = searchTools('', 'optimize');
    expect(optimizeOnly.length).toBeGreaterThan(0);
    expect(optimizeOnly.every((t) => t.category === 'optimize')).toBe(true);

    const hwOnly = searchTools('', 'handwriting');
    expect(hwOnly.length).toBe(1);
    expect(hwOnly[0].id).toBe('handwriting-generator');
  });

  it('should include the handwriting generator tool with correct modal action', () => {
    const hwTool = TOOLS_CATALOG.find((t) => t.id === 'handwriting-generator');
    expect(hwTool).toBeDefined();
    expect(hwTool?.name).toContain('Handwritten Assignment Generator');
    expect(hwTool?.action).toEqual({ type: 'modal', modal: 'handwriting' });
  });
});
