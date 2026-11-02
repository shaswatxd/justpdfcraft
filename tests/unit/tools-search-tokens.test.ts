import { describe, it, expect } from 'vitest';
import { TOOLS_CATALOG, searchTools } from '@/data/toolsCatalog';

/**
 * User-first search requirements: natural multi-word queries like
 * "photo 50 kb", "join pdf", "pages reorder" and "reduce pdf size"
 * must find the right tool even though no single tag contains the whole phrase.
 */
describe('tokenized tool search', () => {
  it('keeps exactly the expected catalogue shape', () => {
    expect(TOOLS_CATALOG.length).toBe(37);
  });

  it.each([
    ['photo 50 kb', 'target-kb-resizer'],
    ['resize signature 20 kb', 'target-kb-resizer'],
    ['join pdf', 'merge-pdf'],
    ['combine pdf', 'merge-pdf'],
    ['reduce pdf size', 'compress-pdf'],
    ['make pdf smaller', 'compress-pdf'],
    ['pages reorder', 'organize-pdf'],
    ['pdf to word', 'pdf-to-word-doc'],
    ['images to pdf', 'image-to-pdf-tool'],
    ['handwriting', 'handwriting-generator'],
    ['flatten pdf', 'flatten-pdf'],
    ['black and white', 'pdf-to-grayscale'],
    ['extract images', 'extract-images-pdf'],
    ['delete pages', 'delete-pdf-pages'],
    ['dark mode', 'invert-pdf'],
    ['edit metadata', 'metadata-pdf'],
  ])('finds the right tool for "%s"', (query, expectedId) => {
    const results = searchTools(query);
    expect(results.map((t) => t.id)).toContain(expectedId);
  });

  it('returns only matching tools, never everything, for a nonsense query', () => {
    const results = searchTools('zzzqqqxyz');
    expect(results).toHaveLength(0);
  });

  it('forces a completely empty result to be recoverable (clear semantics TestedBy UI)', () => {
    const results = searchTools('compress', 'optimize');
    expect(results).toContainEqual(expect.objectContaining({ id: 'compress-pdf' }));
    expect(results.every((t) => t.category === 'optimize')).toBe(true);
  });
});
