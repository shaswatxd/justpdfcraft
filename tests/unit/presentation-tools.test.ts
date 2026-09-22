import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/uiStore';

describe('Presentation Superpowers: Laser Pointer & Spotlight Reading Focus', () => {
  beforeEach(() => {
    useUIStore.setState({
      isLaserPointerActive: false,
      isSpotlightActive: false,
      isFullscreen: false,
    });
  });

  it('should toggle laser pointer state correctly', () => {
    expect(useUIStore.getState().isLaserPointerActive).toBe(false);

    useUIStore.getState().toggleLaserPointer();
    expect(useUIStore.getState().isLaserPointerActive).toBe(true);

    useUIStore.getState().toggleLaserPointer();
    expect(useUIStore.getState().isLaserPointerActive).toBe(false);
  });

  it('should set laser pointer explicitly', () => {
    useUIStore.getState().setLaserPointer(true);
    expect(useUIStore.getState().isLaserPointerActive).toBe(true);

    useUIStore.getState().setLaserPointer(false);
    expect(useUIStore.getState().isLaserPointerActive).toBe(false);
  });

  it('should toggle spotlight reading focus state correctly', () => {
    expect(useUIStore.getState().isSpotlightActive).toBe(false);

    useUIStore.getState().toggleSpotlight();
    expect(useUIStore.getState().isSpotlightActive).toBe(true);

    useUIStore.getState().toggleSpotlight();
    expect(useUIStore.getState().isSpotlightActive).toBe(false);
  });

  it('should set spotlight reading focus explicitly', () => {
    useUIStore.getState().setSpotlight(true);
    expect(useUIStore.getState().isSpotlightActive).toBe(true);

    useUIStore.getState().setSpotlight(false);
    expect(useUIStore.getState().isSpotlightActive).toBe(false);
  });
});
