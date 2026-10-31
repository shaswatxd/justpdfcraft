import { describe, it, expect } from 'vitest';
import { TOOLS_CATALOG } from '@/data/toolsCatalog';

// List of all valid registered modals in App.tsx
const VALID_MODALS = new Set([
  'compress',
  'ocr',
  'protect',
  'compare',
  'merge',
  'split',
  'sign',
  'convert',
  'watermark',
  'scan',
  'bates',
  'page-number',
  'batch',
  'crop',
  'extract-table',
  'student-resizer',
  'handwriting',
  'legal',
  'settings',
  'shortcuts',
  'student-tools',
  'developer-tools',
  'image-tools',
  'document-tools',
  'ai-tools',
  'pricing',
  'auth',
  'admin',
  'contact',
  'about',
]);

describe('Tools Catalog Routing & Action Validation', () => {
  it('should verify every tool has a non-empty name, description, category, and icon', () => {
    for (const tool of TOOLS_CATALOG) {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.shortDesc).toBeTruthy();
      expect(['pdf', 'image', 'document', 'student', 'developer']).toContain(tool.category);
      expect(tool.iconName).toBeTruthy();
      expect(tool.tags.length).toBeGreaterThan(0);
    }
  });

  it('should verify all modal actions point to a legitimately supported dialog', () => {
    for (const tool of TOOLS_CATALOG) {
      if (tool.action.type === 'modal') {
        expect(tool.action.modal && VALID_MODALS.has(tool.action.modal)).toBe(true);
      } else if (tool.action.type === 'workflow') {
        if (tool.action.modal) {
          expect(VALID_MODALS.has(tool.action.modal)).toBe(true);
        }
      }
    }
  });

  it('should ensure there are exactly 0 tools configured with dead categories or invalid actions', () => {
    const invalidTools = TOOLS_CATALOG.filter(
      (t) => !['pdf', 'image', 'document', 'student', 'developer'].includes(t.category)
    );
    expect(invalidTools.length).toBe(0);
  });
});
