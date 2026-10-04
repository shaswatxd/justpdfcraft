import { describe, it, expect } from 'vitest';
import { createDocx } from '../../src/utils/docx';

describe('Microsoft Word (.docx) Utility', () => {
  it('should generate valid .docx binary with ZIP PK header and formatted paragraphs', () => {
    const paragraphs = [
      { text: 'Chapter 1: Advanced Algorithms', isHeading: true, headingLevel: 1 as const },
      { text: 'This is the introductory paragraph with special characters & symbols <like this>.' },
      { text: 'Key Takeaways & Summary', bold: true, fontSizePt: 13 },
      { text: 'Page break following this section.', pageBreakAfter: true },
      { text: 'Section on next page.', italic: true, align: 'center' as const },
    ];

    const docxBytes = createDocx(paragraphs, { title: 'Project Research Report' });

    expect(docxBytes).toBeInstanceOf(Uint8Array);
    expect(docxBytes.length).toBeGreaterThan(600);

    // Verify ZIP magic header PK\x03\x04
    expect(docxBytes[0]).toBe(0x50); // P
    expect(docxBytes[1]).toBe(0x4b); // K
    expect(docxBytes[2]).toBe(0x03);
    expect(docxBytes[3]).toBe(0x04);
  });
});
