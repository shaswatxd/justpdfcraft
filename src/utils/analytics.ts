/**
 * JustPDFCraft Privacy-First Analytics Abstraction
 * 
 * Strict Privacy Guarantee:
 * - Zero tracking of document contents, text, or file names.
 * - Local-first / anonymous event telemetry for UX improvements only.
 */

export type AnalyticsEventType =
  | 'tool_opened'
  | 'tool_favorited'
  | 'tool_unfavorited'
  | 'file_uploaded'
  | 'processing_started'
  | 'processing_completed'
  | 'processing_failed'
  | 'download_clicked'
  | 'theme_changed'
  | 'category_viewed';

interface EventProperties {
  toolId?: string;
  category?: string;
  success?: boolean;
  format?: string;
  error?: string;
  [key: string]: any;
}

class AnalyticsService {
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const pref = localStorage.getItem('justpdfcraft_analytics_optout') || localStorage.getItem('swifteditoo_analytics_optout');
        if (pref === 'true') {
          this.isEnabled = false;
        }
      } catch {}
    }
  }

  public trackEvent(eventName: AnalyticsEventType, properties: EventProperties = {}) {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Filter out any sensitive fields if mistakenly passed
    const sanitizedProps = { ...properties };
    delete sanitizedProps.fileName;
    delete sanitizedProps.filePath;
    delete sanitizedProps.content;
    delete sanitizedProps.text;
    delete sanitizedProps.apiKey;

    // Log safely in development
    if ((import.meta as any).env?.DEV) {
      // console.log(`[Analytics: ${eventName}]`, sanitizedProps);
    }

    // Future integration placeholder: Google Analytics 4, Plausible, or Umami
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', eventName, sanitizedProps);
    }
  }

  public setOptOut(optOut: boolean) {
    this.isEnabled = !optOut;
    try {
      localStorage.setItem('justpdfcraft_analytics_optout', optOut ? 'true' : 'false');
    } catch {}
  }

  public isOptedOut(): boolean {
    return !this.isEnabled;
  }
}

export const analytics = new AnalyticsService();
