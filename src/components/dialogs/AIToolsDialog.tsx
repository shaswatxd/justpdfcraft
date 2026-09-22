import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  MessageSquareText,
  BookMarked,
  CheckSquare,
  Layers,
  CheckCheck,
  Languages,
  CalendarCheck,
  FileBadge,
  Key,
  Copy,
  Download,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import {
  AIService,
  AIConfig,
  getAIConfig,
  saveAIConfig,
  isAIConfigured,
} from '@/services/aiService';

type AIToolTab =
  | 'ask'
  | 'summarize'
  | 'notes'
  | 'mcqs'
  | 'flashcards'
  | 'grammar'
  | 'translate'
  | 'study-plan'
  | 'resume'
  | 'settings';

export const AIToolsDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeAITab, setActiveAITab, addToast } = useUIStore();
  const { documentId, fileName } = useDocumentStore();

  const isOpen = activeModal === 'ai-tools';
  const [activeTab, setActiveTab] = useState<AIToolTab>('ask');

  // Input & state
  const [inputText, setInputText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [resultText, setResultText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedPdfText, setExtractedPdfText] = useState('');

  // Settings state
  const [aiConfig, setAiConfigState] = useState<AIConfig>(getAIConfig());
  const [isConfigured, setIsConfigured] = useState(isAIConfigured());

  useEffect(() => {
    if (activeAITab) {
      setActiveTab(activeAITab as AIToolTab);
    }
  }, [activeAITab]);

  // If a document is active, extract first page for initial study context
  useEffect(() => {
    if (isOpen && documentId && !extractedPdfText) {
      const engine = getPDFEngine();
      engine
        .extractPageText(documentId, 0)
        .then((res) => {
          if (res?.text) {
            setExtractedPdfText(res.text.slice(0, 8000));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, documentId, extractedPdfText]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveModal(null);
    setActiveAITab(null);
  };

  const handleSaveSettings = () => {
    saveAIConfig(aiConfig);
    const configured = isAIConfigured();
    setIsConfigured(configured);
    addToast({
      type: configured ? 'success' : 'warning',
      title: 'AI Settings Saved',
      message: configured
        ? `Configured with ${aiConfig.provider.toUpperCase()} provider.`
        : 'API Key missing. Enter your key to activate AI tools.',
    });
  };

  const executeAITool = async () => {
    if (!isConfigured) {
      setActiveTab('settings');
      addToast({
        type: 'info',
        title: 'API Key Required',
        message: 'Please add your Google Gemini or OpenAI API key to use real AI.',
      });
      return;
    }

    const context = inputText.trim() || extractedPdfText.trim();
    let prompt = '';

    if (activeTab === 'ask') {
      if (!customPrompt.trim()) {
        addToast({ type: 'warning', title: 'Question Required', message: 'Please type your question.' });
        return;
      }
      prompt = `Answer the following student question accurately based on the context:\nQuestion: ${customPrompt}`;
    } else if (activeTab === 'summarize') {
      prompt = 'Provide a structured, high-yield summary of the provided text. Include key takeaways in bullet points and important terminology.';
    } else if (activeTab === 'notes') {
      prompt = 'Transform the provided study material into clear, concise revision notes. Include key definitions, formulas/rules, and bulleted takeaways for quick exam revision.';
    } else if (activeTab === 'mcqs') {
      prompt = 'Generate 5 high-quality multiple-choice practice questions (MCQs) based on the text. Each question must have 4 options (A, B, C, D), indicate the correct answer, and provide a brief explanation.';
    } else if (activeTab === 'flashcards') {
      prompt = 'Create 8 active recall flashcards from the text in the format:\nQ: [Question]\nA: [Concise Answer]';
    } else if (activeTab === 'grammar') {
      prompt = 'Proofread and polish the provided text. Fix grammatical errors, improve clarity, and elevate the academic vocabulary while preserving the original meaning.';
    } else if (activeTab === 'translate') {
      prompt = `Translate the provided text into clear academic English (or into Hindi if already in English):\n${customPrompt ? `Target Language: ${customPrompt}` : ''}`;
    } else if (activeTab === 'study-plan') {
      prompt = `Generate a realistic day-by-day revision study timetable for the topics covered in the text for an upcoming exam in 2 weeks.`;
    } else if (activeTab === 'resume') {
      prompt = 'Transform the provided student project/coursework summary into 4 impactful, action-verb driven resume bullet points using the XYZ formula (Accomplished [X] as measured by [Y] by doing [Z]).';
    }

    setIsLoading(true);
    setResultText('');

    try {
      const response = await AIService.generateResponse(prompt, context);
      setResultText(response);
      addToast({ type: 'success', title: 'Response Generated' });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Generation Failed',
        message: err?.message || 'Could not connect to AI provider.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(resultText);
    addToast({ type: 'success', title: 'Copied to Clipboard' });
  };

  const downloadResult = () => {
    const blob = new Blob([resultText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JustPDFCraft_AI_${activeTab}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Downloaded as Markdown' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="w-full max-w-4xl h-[88vh] max-h-[800px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                AI Productivity Suite
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                    isConfigured
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {isConfigured ? 'Connected' : 'Setup Required'}
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Ribbon */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-3 py-2 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
          {[
            { id: 'ask' as const, label: 'Ask PDF', icon: MessageSquareText },
            { id: 'summarize' as const, label: 'Summarizer', icon: Sparkles },
            { id: 'notes' as const, label: 'Study Notes', icon: BookMarked },
            { id: 'mcqs' as const, label: 'Generate MCQs', icon: CheckSquare },
            { id: 'flashcards' as const, label: 'Flashcards', icon: Layers },
            { id: 'grammar' as const, label: 'Grammar Polish', icon: CheckCheck },
            { id: 'translate' as const, label: 'Translator', icon: Languages },
            { id: 'study-plan' as const, label: 'Study Plan', icon: CalendarCheck },
            { id: 'resume' as const, label: 'Resume Assistant', icon: FileBadge },
            { id: 'settings' as const, label: 'API Key & Provider', icon: Key },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Unconfigured Alert Banner */}
        {!isConfigured && activeTab !== 'settings' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Real AI integration requires an API key (Google Gemini is free). No fake data is simulated.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded font-semibold transition-colors"
            >
              Configure API Key →
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'settings' ? (
            /* Settings View */
            <div className="max-w-xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">AI Provider Configuration</h3>
                <p className="text-xs text-slate-400">
                  JustPDFCraft connects directly to Google Gemini or OpenAI from your browser.
                  Keys are stored exclusively in your local storage.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Choose Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAiConfigState({ ...aiConfig, provider: 'gemini' })}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        aiConfig.provider === 'gemini'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">Google Gemini</p>
                        <p className="text-[10px] text-emerald-400">Free Tier Available</p>
                      </div>
                      {aiConfig.provider === 'gemini' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </button>

                    <button
                      onClick={() => setAiConfigState({ ...aiConfig, provider: 'openai' })}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        aiConfig.provider === 'openai'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">OpenAI</p>
                        <p className="text-[10px] text-slate-400">GPT-4o mini</p>
                      </div>
                      {aiConfig.provider === 'openai' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </button>
                  </div>
                </div>

                {aiConfig.provider === 'gemini' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Google Gemini API Key</label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-swift-400 hover:underline flex items-center gap-1"
                      >
                        Get Free Gemini Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={aiConfig.geminiApiKey}
                      onChange={(e) => setAiConfigState({ ...aiConfig, geminiApiKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-swift-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">OpenAI API Key</label>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-swift-400 hover:underline flex items-center gap-1"
                      >
                        Get OpenAI Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      placeholder="sk-proj-..."
                      value={aiConfig.openaiApiKey}
                      onChange={(e) => setAiConfigState({ ...aiConfig, openaiApiKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-swift-500 font-mono"
                    />
                  </div>
                )}

                <button
                  onClick={handleSaveSettings}
                  className="w-full py-2.5 bg-swift-600 hover:bg-swift-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-swift-900/40"
                >
                  Save API Settings
                </button>
              </div>
            </div>
          ) : (
            /* Tool Runner View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Left Column: Context / Input */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Source Material / Document Context
                  </span>
                  {documentId && (
                    <span className="text-[11px] text-swift-400 font-medium truncate max-w-[200px]">
                      From: {fileName}
                    </span>
                  )}
                </div>

                <textarea
                  value={inputText || extractedPdfText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setExtractedPdfText('');
                  }}
                  placeholder="Paste study text, chapter excerpts, or notes here..."
                  className="w-full flex-1 min-h-[220px] bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans resize-none leading-relaxed"
                />

                {activeTab === 'ask' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Your Question</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g. Explain the second theorem in simple words..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'translate' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Target Language</label>
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. Hindi, Spanish, French, German..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <button
                  onClick={executeAITool}
                  disabled={isLoading}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30"
                >
                  <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Generating Response...' : 'Run with Real AI'}
                </button>
              </div>

              {/* Right Column: Output Result */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    AI Output
                  </span>
                  {resultText && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={copyResult}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={downloadResult}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Download Markdown"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-y-auto text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                      <Sparkles className="w-8 h-8 text-indigo-400 animate-bounce" />
                      <p className="text-xs">Contacting AI Provider and processing text...</p>
                    </div>
                  ) : resultText ? (
                    resultText
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-slate-600" />
                      <p className="text-xs">Generated notes, summaries, or questions will appear here.</p>
                      <p className="text-[11px] text-slate-600 max-w-xs">
                        Zero simulated output. Real responses powered by Google Gemini or OpenAI.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
