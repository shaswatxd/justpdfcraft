import { describe, it, expect } from 'vitest';
import { pointsToSvgPath, distanceToStroke, distToSegmentSquared } from '@/utils/spline-utils';

describe('Spline & Collision Utils', () => {
  it('should handle empty or single point lists gracefully', () => {
    expect(pointsToSvgPath([])).toBe('');
    expect(pointsToSvgPath([{ x: 10, y: 20 }])).toBe('M 10.0 20.0 L 10.0 20.0');
    expect(pointsToSvgPath([{ x: 10, y: 20 }, { x: 30, y: 40 }])).toBe('M 10.0 20.0 L 30.0 40.0');
  });

  it('should generate cubic bezier spline curves for multiple points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 30, y: 15 },
      { x: 50, y: 40 },
    ];
    const path = pointsToSvgPath(points);
    expect(path).toContain('M 0.0 0.0');
    expect(path).toContain('C ');
    // Count number of bezier curves (points.length - 1 = 3 segments)
    const curveMatches = path.match(/ C /g);
    expect(curveMatches?.length).toBe(3);
  });

  it('should accurately calculate distance from point to stroke for eraser collision', () => {
    const stroke = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];

    // Point directly on stroke
    expect(distanceToStroke({ x: 50, y: 0 }, stroke)).toBe(0);

    // Point perpendicular to stroke segment
    expect(distanceToStroke({ x: 50, y: 10 }, stroke)).toBe(10);
    expect(distanceToStroke({ x: 50, y: -15 }, stroke)).toBe(15);

    // Point past the start point
    expect(distanceToStroke({ x: -10, y: 0 }, stroke)).toBe(10);

    // Point past the end point
    expect(distanceToStroke({ x: 110, y: 0 }, stroke)).toBe(10);
  });

  it('should compute squared distance to line segment correctly', () => {
    const d2 = distToSegmentSquared({ x: 10, y: 10 }, { x: 0, y: 0 }, { x: 20, y: 0 });
    expect(d2).toBe(100);
  });
});
