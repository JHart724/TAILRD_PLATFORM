import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Phone } from 'lucide-react';
import { errorHandler, ErrorSeverity, ErrorCategory } from '../../utils/ErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  module?: string;
  component?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create comprehensive error object
    const tailrdError = errorHandler.createError({
      message: `React Error Boundary: ${error.message}`,
      originalError: error,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.RENDERING,
      isRecoverable: true,
      userMessage: 'A component failed to load. Please try refreshing.',
      technicalDetails: errorInfo.componentStack,
      context: {
        module: this.props.module,
        component: this.props.component || 'Unknown',
        action: 'Component Render',
        stackTrace: error.stack,
        additionalData: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true
        }
      }
    });

    // Handle error through error handler
    errorHandler.handleError(tailrdError);

    // Update state with error details
    this.setState({
      errorId: tailrdError.id,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((item, idx) => prevProps.resetKeys?.[idx] !== item)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      errorInfo: null
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReportBug = () => {
    const { error, errorId, errorInfo } = this.state;
    
    const bugReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      module: this.props.module,
      component: this.props.component,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // In a real implementation, this would submit to a bug tracking system
    console.log('Bug Report:', bugReport);
    alert('Bug report has been submitted. Error ID: ' + errorId);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50/30 to-yellow-50/20 p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            {/* Error Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-red-200/50">
              {/* Error Icon */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  Something Went Wrong
                </h1>
                <p className="text-steel-600">
                  {this.props.module ? `${this.props.module} module` : 'A component'} encountered an unexpected error.
                </p>
              </div>

              {/* Error Details */}
              <div className="bg-red-50 rounded-xl p-4 mb-6 border border-red-200">
                <div className="text-sm">
                  <div className="font-semibold text-red-900 mb-2">Error Details:</div>
                  <div className="text-red-700 mb-2">{this.state.error?.message}</div>
                  {this.state.errorId && (
                    <div className="text-xs text-red-600">
                      Error ID: {this.state.errorId}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-medical-blue-600 text-white rounded-xl hover:bg-medical-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-steel-600 text-white rounded-xl hover:bg-steel-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-medical-green-600 text-white rounded-xl hover:bg-medical-green-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </button>
                
                <button
                  onClick={this.handleReportBug}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-medical-amber-600 text-white rounded-xl hover:bg-medical-amber-700 transition-colors"
                >
                  <Bug className="w-4 h-4" />
                  Report Issue
                </button>
              </div>

              {/* Support Information */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">Need Immediate Help?</div>
                    <div className="text-sm text-blue-700">
                      Contact IT Support: <span className="font-mono">ext. 4357</span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Please provide Error ID: {this.state.errorId}
                    </div>
                  </div>
                </div>
              </div>

              {/* Development Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <summary className="font-semibold text-gray-900 cursor-pointer mb-2">
                    Development Details
                  </summary>
                  <div className="text-xs text-gray-600 space-y-2">
                    <div>
                      <div className="font-semibold">Error Stack:</div>
                      <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                    <div>
                      <div className="font-semibold">Component Stack:</div>
                      <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundary;