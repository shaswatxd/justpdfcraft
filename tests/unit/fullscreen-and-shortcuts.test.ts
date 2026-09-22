import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/uiStore';

describe('Fullscreen Presentation Mode & Shortcuts Modal UI State', () => {
  beforeEach(() => {
    useUIStore.setState({
      isFullscreen: false,
      activeModal: null,
    });
  });

  it('should toggle fullscreen state correctly', () => {
    expect(useUIStore.getState().isFullscreen).toBe(false);

    useUIStore.getState().toggleFullscreen();
    expect(useUIStore.getState().isFullscreen).toBe(true);

    useUIStore.getState().toggleFullscreen();
    expect(useUIStore.getState().isFullscreen).toBe(false);
  });

  it('should set fullscreen explicitly', () => {
    useUIStore.getState().setFullscreen(true);
    expect(useUIStore.getState().isFullscreen).toBe(true);

    useUIStore.getState().setFullscreen(false);
    expect(useUIStore.getState().isFullscreen).toBe(false);
  });

  it('should open and close shortcuts modal', () => {
    expect(useUIStore.getState().activeModal).toBe(null);

    useUIStore.getState().setActiveModal('shortcuts');
    expect(useUIStore.getState().activeModal).toBe('shortcuts');

    useUIStore.getState().setActiveModal(null);
    expect(useUIStore.getState().activeModal).toBe(null);
  });
});
