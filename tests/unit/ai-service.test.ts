import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAIConfig,
  saveAIConfig,
  isAIConfigured,
  AIService,
} from '@/services/aiService';

// In-memory mock for localStorage in node test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, val: string) => {
    mockStorage[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  }),
};

// Assign to global
(globalThis as any).localStorage = localStorageMock;
(globalThis as any).window = globalThis;

describe('AI Service & Architecture', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should detect unconfigured state when no API key is set', () => {
    expect(isAIConfigured()).toBe(false);
  });

  it('should save and retrieve Gemini configuration from localStorage', () => {
    saveAIConfig({
      provider: 'gemini',
      geminiApiKey: 'test-gemini-key-12345',
      openaiApiKey: '',
    });

    const config = getAIConfig();
    expect(config.provider).toBe('gemini');
    expect(config.geminiApiKey).toBe('test-gemini-key-12345');
    expect(isAIConfigured()).toBe(true);
  });

  it('should save and retrieve OpenAI configuration from localStorage', () => {
    saveAIConfig({
      provider: 'openai',
      geminiApiKey: '',
      openaiApiKey: 'sk-test-openai-key-abcde',
    });

    const config = getAIConfig();
    expect(config.provider).toBe('openai');
    expect(config.openaiApiKey).toBe('sk-test-openai-key-abcde');
    expect(isAIConfigured()).toBe(true);
  });

  it('should throw an informative error when calling AIService unconfigured without fake data', async () => {
    saveAIConfig({
      provider: 'gemini',
      geminiApiKey: '',
      openaiApiKey: '',
    });

    await expect(AIService.generateResponse('Summarize this document')).rejects.toThrow(
      /Google Gemini API Key is not configured/
    );
  });
});
