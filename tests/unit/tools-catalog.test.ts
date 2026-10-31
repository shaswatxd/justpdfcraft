import { describe, it, expect } from 'vitest';
import { TOOLS_CATALOG, getToolsByCategory, searchTools } from '@/data/toolsCatalog';

describe('Master Tools Catalog', () => {
  it('should contain tools across all 5 genuine categories (pdf, image, document, student, developer)', () => {
    const pdfTools = getToolsByCategory('pdf');
    const imageTools = getToolsByCategory('image');
    const docTools = getToolsByCategory('document');
    const studentTools = getToolsByCategory('student');
    const devTools = getToolsByCategory('developer');

    expect(pdfTools.length).toBe(30);
    expect(imageTools.length).toBe(16);
    expect(docTools.length).toBe(10);
    expect(studentTools.length).toBe(17);
    expect(devTools.length).toBe(20);
    expect(TOOLS_CATALOG.length).toBe(93);
  });

  it('should search tools accurately by name, description, or keyword tags', () => {
    const compressResults = searchTools('compress');
    expect(compressResults.length).toBeGreaterThan(0);
    expect(compressResults.some((t) => t.id === 'compress-pdf')).toBe(true);

    const resizerResults = searchTools('resizer');
    expect(resizerResults.some((t) => t.id === 'target-kb-resizer')).toBe(true);

    const ocrResults = searchTools('ocr');
    expect(ocrResults.some((t) => t.id === 'ocr-pdf')).toBe(true);

    const jsonResults = searchTools('json');
    expect(jsonResults.some((t) => t.id === 'json-formatter')).toBe(true);
  });

  it('should filter tools by category when category filter is supplied', () => {
    const studentOnly = searchTools('', 'student');
    expect(studentOnly.every((t) => t.category === 'student')).toBe(true);
    expect(studentOnly.length).toBe(17);

    const imageOnly = searchTools('', 'image');
    expect(imageOnly.every((t) => t.category === 'image')).toBe(true);
    expect(imageOnly.length).toBe(16);

    const devOnly = searchTools('', 'developer');
    expect(devOnly.every((t) => t.category === 'developer')).toBe(true);
    expect(devOnly.length).toBe(20);
  });

  it('should include the handwriting generator tool with correct modal action', () => {
    const hwTool = TOOLS_CATALOG.find((t) => t.id === 'handwriting-generator');
    expect(hwTool).toBeDefined();
    expect(hwTool?.name).toContain('Handwritten Assignment Generator');
    expect(hwTool?.category).toBe('student');
    expect(hwTool?.action).toEqual({ type: 'modal', modal: 'handwriting' });
  });
});
