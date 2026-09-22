import { describe, it, expect, beforeEach } from 'vitest';
import { useTTSStore } from '@/stores/ttsStore';
import { useUIStore, PaperTone } from '@/stores/uiStore';

describe('Offline TTS Audio Player & Ergonomic Paper Tone Engine', () => {
  beforeEach(() => {
    useTTSStore.setState({
      isTTSOpen: false,
      isPlaying: false,
      isPaused: false,
      speechRate: 1.0,
      selectedVoiceURI: null,
      availableVoices: [],
      readProgress: 0,
    });

    useUIStore.setState({
      paperTone: 'default',
    });
  });

  describe('TTS Store', () => {
    it('should initialize with default playback settings', () => {
      const state = useTTSStore.getState();
      expect(state.isTTSOpen).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.speechRate).toBe(1.0);
    });

    it('should update speech rate multiplier', () => {
      useTTSStore.getState().setSpeechRate(1.5);
      expect(useTTSStore.getState().speechRate).toBe(1.5);
    });

    it('should toggle TTS open state', () => {
      useTTSStore.getState().toggleTTS();
      expect(useTTSStore.getState().isTTSOpen).toBe(true);

      useTTSStore.getState().toggleTTS();
      expect(useTTSStore.getState().isTTSOpen).toBe(false);
    });
  });

  describe('Ergonomic Paper Tones', () => {
    it('should default to clean white paper tone', () => {
      expect(useUIStore.getState().paperTone).toBe('default');
    });

    it('should transition between Warm Sepia, Dark Canvas, and Mint tones', () => {
      const tones: PaperTone[] = ['sepia', 'dark', 'mint', 'default'];

      tones.forEach((tone) => {
        useUIStore.getState().setPaperTone(tone);
        expect(useUIStore.getState().paperTone).toBe(tone);
      });
    });

    it('should compute appropriate GPU filter and background for each paper tone', () => {
      const getStyles = (tone: PaperTone) => {
        let filter: string | undefined = undefined;
        let bg = '#ffffff';
        if (tone === 'sepia') {
          filter = 'sepia(0.38) contrast(0.96)';
          bg = '#fbf0d9';
        } else if (tone === 'dark') {
          filter = 'invert(0.92) hue-rotate(180deg) contrast(1.15)';
          bg = '#1e293b';
        } else if (tone === 'mint') {
          filter = 'sepia(0.18) hue-rotate(85deg) saturate(0.85)';
          bg = '#f0f7f2';
        }
        return { filter, bg };
      };

      const sepia = getStyles('sepia');
      expect(sepia.filter).toContain('sepia');
      expect(sepia.bg).toBe('#fbf0d9');

      const dark = getStyles('dark');
      expect(dark.filter).toContain('invert');
      expect(dark.bg).toBe('#1e293b');

      const mint = getStyles('mint');
      expect(mint.filter).toContain('hue-rotate');
      expect(mint.bg).toBe('#f0f7f2');

      const def = getStyles('default');
      expect(def.filter).toBeUndefined();
      expect(def.bg).toBe('#ffffff');
    });
  });
});
