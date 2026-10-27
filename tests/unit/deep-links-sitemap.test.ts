import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getToolFromSearch } from '@/utils/deepLink';
import { TOOLS_CATALOG } from '@/data/toolsCatalog';

describe('Per-tool deep links (?tool=<id>)', () => {
  it('should resolve every catalog tool id from its query string', () => {
    for (const tool of TOOLS_CATALOG) {
      const { tool: resolved } = getToolFromSearch(`?tool=${tool.id}`);
      expect(resolved, `missing deep link for ${tool.id}`).toBeDefined();
      expect(resolved?.id).toBe(tool.id);
    }
  });

  it('should strip the consumed tool param and preserve remaining params', () => {
    const { tool, cleaned } = getToolFromSearch('?tool=merge-pdf');
    expect(tool?.id).toBe('merge-pdf');
    expect(cleaned).toBe('');

    const withExtra = getToolFromSearch('?tool=split-pdf&ref=email');
    expect(withExtra.tool?.id).toBe('split-pdf');
    expect(withExtra.cleaned).toBe('?ref=email');
  });

  it('should return null for missing or unknown tool ids (never crash)', () => {
    expect(getToolFromSearch('').tool).toBeNull();
    expect(getToolFromSearch('?foo=bar').tool).toBeNull();
    expect(getToolFromSearch('?tool=does-not-exist').tool).toBeNull();
  });

  it('should work without a leading question mark', () => {
    expect(getToolFromSearch('tool=ocr-pdf').tool?.id).toBe('ocr-pdf');
  });
});

describe('Sitemap per-tool coverage', () => {
  const sitemap = readFileSync(path.resolve(__dirname, '../../public/sitemap.xml'), 'utf8');

  it('should list the homepage', () => {
    expect(sitemap).toContain('<loc>https://justpdfcraft.xyz/</loc>');
  });

  it('should contain one deep-link URL for every catalog tool', () => {
    for (const tool of TOOLS_CATALOG) {
      expect(sitemap, `sitemap missing ${tool.id}`).toContain(
        `<loc>https://justpdfcraft.xyz/?tool=${tool.id}</loc>`
      );
    }
  });

  it('should not contain dead tool URLs outside the catalog', () => {
    const urls = [...sitemap.matchAll(/\?tool=([a-z0-9-]+)/g)].map((m) => m[1]);
    const ids = new Set(TOOLS_CATALOG.map((t) => t.id));
    for (const id of urls) {
      expect(ids.has(id), `sitemap has unknown tool ${id}`).toBe(true);
    }
    expect(urls.length).toBe(TOOLS_CATALOG.length);
  });
});
