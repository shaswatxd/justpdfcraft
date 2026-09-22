import { create } from 'zustand';

interface TTSState {
  isTTSOpen: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  speechRate: number; // 0.75, 1.0, 1.25, 1.5, 2.0
  selectedVoiceURI: string | null;
  availableVoices: SpeechSynthesisVoice[];
  readProgress: number; // 0 to 100%
  totalWords: number;
  currentWordIndex: number;
  activeSnippet: string;

  setTTSOpen: (open: boolean) => void;
  toggleTTS: () => void;
  setSpeechRate: (rate: number) => void;
  setSelectedVoiceURI: (uri: string) => void;
  loadVoices: () => void;

  playText: (text: string, onEndCallback?: () => void) => void;
  playPageText: (text: string, onEndCallback?: () => void) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

// Module-level timers and queue to avoid React batching/stale closures
let activeHeartbeat: any = null;
let utteranceQueue: string[] = [];
let currentQueueIndex = 0;
let queueOnEndCallback: (() => void) | null = null;
let currentSessionId = 0;

function clearHeartbeat() {
  if (activeHeartbeat) {
    clearInterval(activeHeartbeat);
    activeHeartbeat = null;
  }
}

function startHeartbeat() {
  clearHeartbeat();
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  // Chromium keep-alive heartbeat: toggling pause/resume prevents the 15-second speech cutoff
  activeHeartbeat = setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 9500);
}

// Split text into natural sentence chunks for smooth, cutoff-free speech
function chunkTextIntoSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  // Split on periods, exclamation marks, question marks, Hindi purna viram (।), or double newlines
  const rawChunks = normalized.split(/(?<=[.?!।\n])\s+/);
  const result: string[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    // If a sentence is unusually long (> 220 chars), further split on commas/semicolons
    if (trimmed.length > 220) {
      const subParts = trimmed.split(/(?<=[,;])\s+/);
      for (const sp of subParts) {
        if (sp.trim()) result.push(sp.trim());
      }
    } else {
      result.push(trimmed);
    }
  }

  return result.length > 0 ? result : [text.trim()];
}

export const useTTSStore = create<TTSState>((set, get) => ({
  isTTSOpen: false,
  isPlaying: false,
  isPaused: false,
  speechRate: 1.0,
  selectedVoiceURI: null,
  availableVoices: [],
  readProgress: 0,
  totalWords: 0,
  currentWordIndex: 0,
  activeSnippet: '',

  setTTSOpen: (open: boolean) => {
    if (!open) {
      get().stop();
    }
    set({ isTTSOpen: open });
  },

  toggleTTS: () => {
    const current = get().isTTSOpen;
    if (current) {
      get().stop();
      set({ isTTSOpen: false });
    } else {
      get().loadVoices();
      set({ isTTSOpen: true });
    }
  },

  setSpeechRate: (rate: number) => {
    set({ speechRate: rate });
    // If currently playing, restarting from current chunk with new rate will take effect on next chunk
  },

  setSelectedVoiceURI: (uri: string) => set({ selectedVoiceURI: uri }),

  loadVoices: () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;
    set({ availableVoices: voices });

    if (!get().selectedVoiceURI) {
      // Prioritize natural/English voice
      const preferred =
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google'))) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
      if (preferred) {
        set({ selectedVoiceURI: preferred.voiceURI });
      }
    }
  },

  playText: (text: string, onEndCallback?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Increment session ID to invalidate any lingering callbacks
    const sessionId = ++currentSessionId;

    clearHeartbeat();
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) {
      set({ isPlaying: false, isPaused: false, readProgress: 0, activeSnippet: '' });
      return;
    }

    const words = cleanText.split(/\s+/);
    const totalWords = words.length;

    // Split into robust sentences to completely prevent the 15-second browser silence bug
    utteranceQueue = chunkTextIntoSentences(cleanText);
    currentQueueIndex = 0;
    queueOnEndCallback = onEndCallback || null;

    set({
      isPlaying: true,
      isPaused: false,
      readProgress: 0,
      totalWords,
      currentWordIndex: 0,
      activeSnippet: utteranceQueue[0] || '',
    });

    // Detect if text contains Hindi characters
    const hasHindi = /[\u0900-\u097F]/.test(cleanText);

    const speakNextChunk = () => {
      if (sessionId !== currentSessionId) return;
      if (currentQueueIndex >= utteranceQueue.length) {
        clearHeartbeat();
        set({ isPlaying: false, isPaused: false, readProgress: 100, activeSnippet: '' });
        if (queueOnEndCallback) queueOnEndCallback();
        return;
      }

      const chunk = utteranceQueue[currentQueueIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      const { speechRate, selectedVoiceURI, availableVoices } = get();

      utterance.rate = speechRate;

      // Match voice: if text is Hindi, prefer a Hindi voice
      if (hasHindi) {
        const hindiVoice = availableVoices.find((v) => v.lang.startsWith('hi'));
        if (hindiVoice) {
          utterance.voice = hindiVoice;
        }
      } else if (selectedVoiceURI && availableVoices.length > 0) {
        const voice = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => {
        if (sessionId !== currentSessionId) return;
        currentQueueIndex += 1;
        const progress = Math.min(100, Math.round((currentQueueIndex / utteranceQueue.length) * 100));
        set({
          readProgress: progress,
          activeSnippet: utteranceQueue[currentQueueIndex] || '',
        });
        speakNextChunk();
      };

      utterance.onerror = (e) => {
        if (sessionId !== currentSessionId) return;
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('TTS Speech synthesis error:', e);
        }
        // Advance to next chunk on non-fatal error
        currentQueueIndex += 1;
        speakNextChunk();
      };

      window.speechSynthesis.speak(utterance);
    };

    // 40ms delay after window.speechSynthesis.cancel() guarantees Chrome cleans audio channels
    setTimeout(() => {
      if (sessionId === currentSessionId) {
        startHeartbeat();
        speakNextChunk();
      }
    }, 40);
  },

  playPageText: (text: string, onEndCallback?: () => void) => {
    get().playText(text, onEndCallback);
  },

  pause: () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (get().isPlaying && !get().isPaused) {
      clearHeartbeat();
      window.speechSynthesis.pause();
      set({ isPaused: true });
    }
  },

  resume: () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (get().isPlaying && get().isPaused) {
      window.speechSynthesis.resume();
      startHeartbeat();
      set({ isPaused: false });
    }
  },

  stop: () => {
    currentSessionId++;
    clearHeartbeat();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceQueue = [];
    currentQueueIndex = 0;
    queueOnEndCallback = null;
    set({ isPlaying: false, isPaused: false, readProgress: 0, currentWordIndex: 0, activeSnippet: '' });
  },
}));
