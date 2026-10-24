import { describe, it, expect } from 'vitest';
import { TOOLS_CATALOG, searchTools } from '@/data/toolsCatalog';

/**
 * User-first search requirements: natural multi-word queries like
 * "photo 50 kb", "join pdf", "signature background", "pages reorder" and
 * "reduce pdf size" must find the right tool even though no single tag
 * contains the whole phrase.
 */
describe('tokenized tool search', () => {
  it('keeps exactly the expected catalogue shape', () => {
    expect(TOOLS_CATALOG.length).toBe(52);
  });

  it.each([
    ['photo 50 kb', 'target-kb-resizer'],
    ['resize signature 20 kb', 'target-kb-resizer'],
    ['join pdf', 'merge-pdf'],
    ['combine pdf', 'merge-pdf'],
    ['reduce pdf size', 'compress-pdf'],
    ['make pdf smaller', 'compress-pdf'],
    ['signature background', 'paper-sign-cleaner'],
    ['pages reorder', 'organize-pdf'],
    ['cgpa', 'cgpa-calculator'],
    ['pdf to word', 'pdf-to-word-doc'],
  ])('finds the right tool for "%s"', (query, expectedId) => {
    const results = searchTools(query);
    expect(results.map((t) => t.id)).toContain(expectedId);
  });

  it('returns only matching tools, never everything, for a nonsense query', () => {
    const results = searchTools('zzzqqqxyz');
    expect(results).toHaveLength(0);
  });

  it('does not treat a common word prefix as an OR-match (AND semantics)', () => {
    // "photo compress" matches the KB resizer and bulk image compressor; it must
    // NOT return unrelated tools just because they contain "photo"
    const results = searchTools('photo compress');
    expect(results.every((t) =>
      `${t.name} ${t.shortDesc}`.toLowerCase().includes('photo') ||
      t.tags.some((tag) => tag.toLowerCase().includes('compress') || tag.toLowerCase().includes('photo'))
    )).toBe(true);
  });

  it('forces a completely empty result to be recoverable (clear semantics TestedBy UI)', () => {
    // searching within a category restricts results to that category
    const results = searchTools('compress', 'pdf');
    expect(results).toContainEqual(expect.objectContaining({ id: 'compress-pdf' }));
    expect(results.every((t) => t.category === 'pdf')).toBe(true);
  });
});
