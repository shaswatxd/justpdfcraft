/**
 * Vector spline utilities for smooth Bézier drawing and collision detection.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Converts a sequence of discrete points into a smooth Catmull-Rom to Cubic Bézier SVG path data string.
 */
export function pointsToSvgPath(points: Point[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Calculates squared minimum distance from point p to line segment vw.
 */
export function distToSegmentSquared(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
  if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  return (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
}

/**
 * Calculates minimum distance from a query point to any segment in a stroke.
 */
export function distanceToStroke(point: Point, strokePoints: Point[]): number {
  if (!strokePoints || strokePoints.length === 0) return Infinity;
  if (strokePoints.length === 1) {
    return Math.hypot(point.x - strokePoints[0].x, point.y - strokePoints[0].y);
  }

  let minDistanceSq = Infinity;
  for (let i = 0; i < strokePoints.length - 1; i++) {
    const dSq = distToSegmentSquared(point, strokePoints[i], strokePoints[i + 1]);
    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
    }
  }
  return Math.sqrt(minDistanceSq);
}
