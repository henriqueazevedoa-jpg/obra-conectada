import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Contexto exibido no erro para facilitar debug (ex: "CotacaoCentral") */
  context?: string;
  /** Se true, exibe o stack trace completo (útil em dev) */
  showStack?: boolean;
  /** Fallback customizado (opcional) */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log para facilitar debug
    console.group(`[ErrorBoundary] ${this.props.context ?? 'Componente'}`);
    console.error('Erro capturado:', error);
    console.error('Component stack:', errorInfo.componentStack);
    console.groupEnd();
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const { error, errorInfo, showDetails } = this.state;
    const context = this.props.context ?? 'seção';
    const isDev = import.meta.env.DEV;

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 gap-4">
        <div className="w-full max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Erro inesperado em {context}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {error?.message ?? 'Erro desconhecido'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={this.reset}
            >
              <RefreshCw className="h-3 w-3" />
              Tentar novamente
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-muted-foreground"
              onClick={() => window.location.reload()}
            >
              Recarregar página
            </Button>
          </div>

          {/* Stack trace (dev only) */}
          {isDev && (
            <div className="border-t border-destructive/20 pt-3">
              <button
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                {showDetails ? 'Ocultar' : 'Ver'} detalhes técnicos
              </button>
              {showDetails && (
                <pre className="mt-2 text-[10px] text-destructive/70 whitespace-pre-wrap font-mono bg-destructive/5 rounded p-2 max-h-48 overflow-auto">
                  {error?.stack ?? ''}
                  {'\n\nComponent Stack:'}
                  {errorInfo?.componentStack ?? ''}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

/** HOC para wrapping conveniente */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  context?: string
) {
  return function WrappedWithBoundary(props: T) {
    return (
      <ErrorBoundary context={context ?? Component.displayName ?? Component.name}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
