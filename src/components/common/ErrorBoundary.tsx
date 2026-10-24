import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Auto-reload on dynamic import / chunk load failure caused by new deployments
    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('error loading dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('justpdfcraft_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('justpdfcraft_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('error loading dynamically imported module');

      return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl animate-scale-in text-center">
            <div
              className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                isChunkError
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {isChunkError ? <RefreshCw className="w-6 h-6 animate-spin" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {isChunkError ? 'New Version Available' : 'Something went wrong'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {isChunkError
                ? 'JustPDFCraft was just updated with the latest improvements. Reload now to use the newest version.'
                : this.state.error?.message || 'An unexpected error occurred while loading this component.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors flex items-center gap-2 border border-gray-200"
              >
                <X className="w-4 h-4" />
                Close
              </button>
              <button
                onClick={() => {
                  if (typeof caches !== 'undefined') {
                    caches.keys().then((names) => {
                      for (const name of names) caches.delete(name);
                    });
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center gap-2 shadow-md shadow-red-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                {isChunkError ? 'Update & Reload' : 'Reload App'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
