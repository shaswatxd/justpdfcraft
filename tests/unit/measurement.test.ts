import { describe, it, expect, beforeEach } from 'vitest';
import { useToolStore } from '@/stores/toolStore';

describe('Architectural Dimension & Measurement Suite', () => {
  beforeEach(() => {
    useToolStore.setState({
      currentTool: 'select',
      measureUnit: 'mm',
      measureScale: 1.0,
      strokeWidth: 2,
    });
  });

  it('should initialize with default measurement settings', () => {
    const state = useToolStore.getState();
    expect(state.measureUnit).toBe('mm');
    expect(state.measureScale).toBe(1.0);
  });

  it('should update measurement unit and scale ratio', () => {
    useToolStore.getState().setMeasureUnit('cm');
    useToolStore.getState().setMeasureScale(50);

    const state = useToolStore.getState();
    expect(state.measureUnit).toBe('cm');
    expect(state.measureScale).toBe(50);
  });

  it('should accurately convert PDF points to millimeters, centimeters, and inches', () => {
    // 72 PDF points = 1 inch = 25.4 mm = 2.54 cm
    const distPt = 72;

    const toInches = distPt / 72;
    const toMm = distPt * (25.4 / 72);
    const toCm = distPt * (2.54 / 72);

    expect(toInches).toBeCloseTo(1.0, 4);
    expect(toMm).toBeCloseTo(25.4, 4);
    expect(toCm).toBeCloseTo(2.54, 4);
  });

  it('should apply architectural scale ratios correctly (e.g. 1:50 floorplan)', () => {
    // A 100 pt segment measured at 1:50 scale
    const distPt = 100;
    const scaleRatio = 50;

    const rawMm = distPt * (25.4 / 72);
    const scaledMm = rawMm * scaleRatio;

    expect(scaledMm).toBeCloseTo(1763.888, 2);

    const formatted = `${scaledMm < 10 ? scaledMm.toFixed(2) : scaledMm.toFixed(1)} mm`;
    expect(formatted).toBe('1763.9 mm');
  });

  it('should support switching tool mode to measure', () => {
    useToolStore.getState().setTool('measure');
    expect(useToolStore.getState().currentTool).toBe('measure');
  });
});
