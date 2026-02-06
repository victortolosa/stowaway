import { Component, ErrorInfo, ReactNode } from 'react';

// Extend Window interface for Firebase init error tracking
declare global {
    interface Window {
        FIREBASE_INIT_ERROR?: string;
    }
}

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Root Error Boundary to catch initialization and runtime crashes
 * Prevents "White Screen of Death" by showing a fallback UI
 */
export class RootErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            const initError = window.FIREBASE_INIT_ERROR;

            return (
                <div
                    className="min-h-screen flex items-center justify-center text-center bg-bg-page"
                    style={{
                        paddingTop: 'max(1.5rem, var(--safe-area-inset-top, 0px))',
                        paddingBottom: 'max(1.5rem, var(--safe-area-inset-bottom, 0px))',
                        paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                        paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))',
                    }}
                >
                    <div className="max-w-md w-full bg-bg-surface rounded-2xl shadow-xl p-8 border border-accent-danger/20 mx-4">
                        <div className="w-16 h-16 bg-accent-danger-bg rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h1 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h1>
                        <p className="text-text-secondary mb-6 text-sm">
                            The application encountered a configuration error and could not start correctly.
                        </p>

                        {initError && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-lg p-4 mb-6 text-left">
                                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-500 uppercase tracking-wider mb-2">Diagnostic Information</p>
                                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-mono break-all whitespace-pre-wrap">
                                    {initError}
                                </p>
                            </div>
                        )}

                        {!initError && this.state.error && (
                            <div className="bg-bg-subtle rounded-lg p-4 mb-6 text-left overflow-auto max-h-32">
                                <p className="text-xs text-text-tertiary font-mono italic">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-accent-aqua text-white font-bold rounded-2xl shadow-lg shadow-accent-aqua/20 active:scale-[0.98] transition-all"
                        >
                            Retry Loading
                        </button>

                        <p className="mt-6 text-[10px] text-gray-400 leading-tight">
                            If you are seeing this in production, please check your environment variables (VITE_ prefixed).
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
