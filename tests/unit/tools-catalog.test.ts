import { describe, it, expect } from 'vitest';
import { TOOLS_CATALOG, getToolsByCategory, searchTools } from '@/data/toolsCatalog';

describe('Master Tools Catalog', () => {
  it('should contain tools across all 4 categories (pdf, image, student, ai)', () => {
    const pdfTools = getToolsByCategory('pdf');
    const imageTools = getToolsByCategory('image');
    const studentTools = getToolsByCategory('student');
    const aiTools = getToolsByCategory('ai');

    expect(pdfTools.length).toBeGreaterThanOrEqual(15);
    expect(imageTools.length).toBeGreaterThanOrEqual(8);
    expect(studentTools.length).toBeGreaterThanOrEqual(14);
    expect(aiTools.length).toBeGreaterThanOrEqual(8);
    expect(TOOLS_CATALOG.length).toBeGreaterThanOrEqual(45);
  });

  it('should search tools accurately by name, description, or keyword tags', () => {
    const compressResults = searchTools('compress');
    expect(compressResults.length).toBeGreaterThan(0);
    expect(compressResults.some((t) => t.id === 'compress-pdf')).toBe(true);

    const cgpaResults = searchTools('cgpa');
    expect(cgpaResults.some((t) => t.id === 'cgpa-calculator')).toBe(true);

    const ocrResults = searchTools('ocr');
    expect(ocrResults.some((t) => t.id === 'ocr-pdf')).toBe(true);
  });

  it('should filter tools by category when category filter is supplied', () => {
    const studentOnly = searchTools('', 'student');
    expect(studentOnly.every((t) => t.category === 'student')).toBe(true);
    expect(studentOnly.length).toBeGreaterThanOrEqual(14);

    const imageOnly = searchTools('', 'image');
    expect(imageOnly.every((t) => t.category === 'image')).toBe(true);
  });

  it('should include the handwriting generator tool with correct modal action', () => {
    const hwTool = TOOLS_CATALOG.find((t) => t.id === 'handwriting-generator');
    expect(hwTool).toBeDefined();
    expect(hwTool?.name).toContain('Handwritten Assignment Generator');
    expect(hwTool?.category).toBe('student');
    expect(hwTool?.action).toEqual({ type: 'modal', modal: 'handwriting' });
  });
});
