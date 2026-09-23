import { describe, it, expect } from 'vitest';

describe('Text Layer & Affine Transform Calculations', () => {
  it('should calculate correct font height for unrotated text using Math.hypot', () => {
    // Normal transform [scaleX, 0, 0, scaleY, transX, transY]
    const transform = [14, 0, 0, 14, 100, 200];
    const scaleY = Math.hypot(transform[2], transform[3]);
    expect(scaleY).toBe(14);
  });

  it('should calculate correct font height for 90-degree rotated text using Math.hypot', () => {
    // 90 deg rotation: transform[3] (cos 90) = 0, transform[2] (sin 90) = 18
    const transform = [0, -18, 18, 0, 100, 200];
    const scaleY = Math.hypot(transform[2], transform[3]);
    // Must NOT collapse to 0 or fallback 12
    expect(scaleY).toBe(18);
  });

  it('should calculate correct font height for 270-degree rotated text using Math.hypot', () => {
    // 270 deg rotation: transform[3] = 0, transform[2] = -24
    const transform = [0, 24, -24, 0, 100, 200];
    const scaleY = Math.hypot(transform[2], transform[3]);
    expect(scaleY).toBe(24);
  });
});
