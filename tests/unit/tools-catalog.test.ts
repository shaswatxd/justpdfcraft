import { describe, it, expect } from 'vitest';
import { TOOLS_CATALOG, getToolsByCategory, searchTools } from '@/data/toolsCatalog';

describe('Master Tools Catalog', () => {
  it('should contain tools across core PDF categories matching iLovePDF + Handwritten Generator', () => {
    const organizeTools = getToolsByCategory('organize');
    const optimizeTools = getToolsByCategory('optimize');
    const convertTools = getToolsByCategory('convert');
    const editTools = getToolsByCategory('edit');
    const securityTools = getToolsByCategory('security');
    const handwrittenTools = getToolsByCategory('handwritten');

    expect(organizeTools.length).toBe(6);
    expect(optimizeTools.length).toBe(3);
    expect(convertTools.length).toBe(9);
    expect(editTools.length).toBe(6);
    expect(securityTools.length).toBe(4);
    expect(handwrittenTools.length).toBe(1);
    expect(TOOLS_CATALOG.length).toBe(29);
  });

  it('should search tools accurately by name, description, or keyword tags', () => {
    const compressResults = searchTools('compress');
    expect(compressResults.length).toBeGreaterThan(0);
    expect(compressResults.some((t) => t.id === 'compress-pdf')).toBe(true);

    const ocrResults = searchTools('ocr');
    expect(ocrResults.some((t) => t.id === 'ocr-pdf')).toBe(true);

    const wordResults = searchTools('word');
    expect(wordResults.some((t) => t.id === 'pdf-to-word-doc')).toBe(true);

    const hwResults = searchTools('handwriting');
    expect(hwResults.some((t) => t.id === 'handwriting-generator')).toBe(true);
  });

  it('should filter tools by category when category filter is supplied', () => {
    const organizeOnly = searchTools('', 'organize');
    expect(organizeOnly.every((t) => t.category === 'organize')).toBe(true);
    expect(organizeOnly.length).toBe(6);

    const convertOnly = searchTools('', 'convert');
    expect(convertOnly.every((t) => t.category === 'convert')).toBe(true);
    expect(convertOnly.length).toBe(9);

    const handwrittenOnly = searchTools('', 'handwritten');
    expect(handwrittenOnly.every((t) => t.category === 'handwritten')).toBe(true);
    expect(handwrittenOnly.length).toBe(1);
  });

  it('should include the handwriting generator tool with correct modal action', () => {
    const hwTool = TOOLS_CATALOG.find((t) => t.id === 'handwriting-generator');
    expect(hwTool).toBeDefined();
    expect(hwTool?.name).toContain('Handwritten Assignment Generator');
    expect(hwTool?.category).toBe('handwritten');
    expect(hwTool?.action).toEqual({ type: 'modal', modal: 'handwriting' });
  });
});
