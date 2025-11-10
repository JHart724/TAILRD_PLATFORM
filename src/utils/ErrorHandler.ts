// Comprehensive Error Handling System for TAILRD Platform

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  API = 'api',
  AUTHENTICATION = 'authentication',
  CLINICAL_DATA = 'clinical_data',
  RENDERING = 'rendering',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  SYSTEM = 'system'
}

export interface ErrorContext {
  userId?: string;
  module?: string;
  component?: string;
  action?: string;
  patientId?: string;
  sessionId?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  stackTrace?: string;
  additionalData?: Record<string, any>;
}

export interface TAILRDError {
  id: string;
  message: string;
  originalError?: Error;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  isRecoverable: boolean;
  userMessage: string;
  technicalDetails?: string;
  suggestedActions?: string[];
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: TAILRDError[] = [];
  private errorListeners: ((error: TAILRDError) => void)[] = [];

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandlers(): void {
    // Global error handler for uncaught errors
    window.addEventListener('error', (event) => {
      const error = this.createError({
        message: event.message,
        originalError: event.error,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        isRecoverable: false,
        userMessage: 'An unexpected error occurred. Please refresh the page.',
        context: {
          component: 'Global',
          action: 'Uncaught Exception',
          stackTrace: event.error?.stack
        }
      });
      this.handleError(error);
    });

    // Global handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createError({
        message: event.reason?.message || 'Unhandled promise rejection',
        originalError: event.reason,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        isRecoverable: false,
        userMessage: 'A background operation failed. Please try again.',
        context: {
          component: 'Global',
          action: 'Unhandled Promise Rejection',
          stackTrace: event.reason?.stack
        }
      });
      this.handleError(error);
    });
  }

  public createError(params: {
    message: string;
    originalError?: Error;
    severity: ErrorSeverity;
    category: ErrorCategory;
    isRecoverable: boolean;
    userMessage: string;
    technicalDetails?: string;
    suggestedActions?: string[];
    context?: Partial<ErrorContext>;
  }): TAILRDError {
    const baseContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      userId: this.getCurrentUserId(),
      ...params.context
    };

    return {
      id: this.generateErrorId(),
      message: params.message,
      originalError: params.originalError,
      severity: params.severity,
      category: params.category,
      context: baseContext,
      isRecoverable: params.isRecoverable,
      userMessage: params.userMessage,
      technicalDetails: params.technicalDetails,
      suggestedActions: params.suggestedActions || this.getDefaultActions(params.category)
    };
  }

  public handleError(error: TAILRDError): void {
    // Log error
    this.logError(error);

    // Notify listeners
    this.errorListeners.forEach(listener => listener(error));

    // Send to monitoring service (if configured)
    this.sendToMonitoring(error);

    // Show user notification based on severity
    this.notifyUser(error);
  }

  private logError(error: TAILRDError): void {
    this.errorLog.push(error);

    // Keep only last 100 errors in memory
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Console logging with appropriate level
    const logMethod = this.getConsoleMethod(error.severity);
    logMethod(`[TAILRD Error ${error.id}]`, {
      message: error.message,
      severity: error.severity,
      category: error.category,
      context: error.context,
      technicalDetails: error.technicalDetails,
      originalError: error.originalError
    });
  }

  private getConsoleMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return console.error;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.LOW:
      default:
        return console.log;
    }
  }

  private notifyUser(error: TAILRDError): void {
    // Skip user notification for low severity errors
    if (error.severity === ErrorSeverity.LOW) {
      return;
    }

    // Create user notification based on error
    const notification = {
      type: this.getNotificationType(error.severity),
      title: this.getNotificationTitle(error.category),
      message: error.userMessage,
      actions: error.suggestedActions,
      isRecoverable: error.isRecoverable,
      errorId: error.id
    };

    // Dispatch custom event for UI components to handle
    window.dispatchEvent(new CustomEvent('tailrd-error', { detail: notification }));
  }

  private getNotificationType(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'error';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  private getNotificationTitle(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.API:
        return 'Service Unavailable';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication Required';
      case ErrorCategory.CLINICAL_DATA:
        return 'Clinical Data Error';
      case ErrorCategory.NETWORK:
        return 'Connection Error';
      case ErrorCategory.VALIDATION:
        return 'Invalid Input';
      case ErrorCategory.PERMISSION:
        return 'Access Denied';
      default:
        return 'System Error';
    }
  }

  private getDefaultActions(category: ErrorCategory): string[] {
    switch (category) {
      case ErrorCategory.API:
        return ['Retry operation', 'Check system status', 'Contact support if issue persists'];
      case ErrorCategory.AUTHENTICATION:
        return ['Sign in again', 'Check credentials', 'Contact IT support'];
      case ErrorCategory.NETWORK:
        return ['Check internet connection', 'Retry in a few moments', 'Contact IT support'];
      case ErrorCategory.VALIDATION:
        return ['Review input data', 'Check required fields', 'Follow data format guidelines'];
      case ErrorCategory.PERMISSION:
        return ['Contact administrator', 'Verify access permissions', 'Check role assignments'];
      default:
        return ['Refresh page', 'Try again', 'Contact support if issue persists'];
    }
  }

  private sendToMonitoring(error: TAILRDError): void {
    // Only send high and critical errors to monitoring
    if (error.severity === ErrorSeverity.LOW || error.severity === ErrorSeverity.MEDIUM) {
      return;
    }

    // In a real implementation, this would send to services like Sentry, DataDog, etc.
    const monitoringData = {
      errorId: error.id,
      message: error.message,
      severity: error.severity,
      category: error.category,
      context: error.context,
      stackTrace: error.originalError?.stack,
      timestamp: error.context.timestamp
    };

    // Simulated monitoring service call
    console.log('[Monitoring Service]', monitoringData);
  }

  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('tailrd-session-id');
    if (!sessionId) {
      sessionId = `SES_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tailrd-session-id', sessionId);
    }
    return sessionId;
  }

  private getCurrentUserId(): string | undefined {
    // In a real implementation, this would get the current user from auth context
    return localStorage.getItem('tailrd-user-id') || undefined;
  }

  // Public API methods
  public addErrorListener(listener: (error: TAILRDError) => void): void {
    this.errorListeners.push(listener);
  }

  public removeErrorListener(listener: (error: TAILRDError) => void): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  public getErrorLog(): TAILRDError[] {
    return [...this.errorLog];
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }

  // Convenience methods for common error types
  public handleAPIError(error: Error, context: Partial<ErrorContext> = {}): void {
    const tailrdError = this.createError({
      message: `API Error: ${error.message}`,
      originalError: error,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.API,
      isRecoverable: true,
      userMessage: 'Unable to connect to service. Please try again.',
      context: { ...context, action: 'API Call' }
    });
    this.handleError(tailrdError);
  }

  public handleValidationError(message: string, context: Partial<ErrorContext> = {}): void {
    const tailrdError = this.createError({
      message: `Validation Error: ${message}`,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.VALIDATION,
      isRecoverable: true,
      userMessage: message,
      context: { ...context, action: 'Data Validation' }
    });
    this.handleError(tailrdError);
  }

  public handlePermissionError(action: string, context: Partial<ErrorContext> = {}): void {
    const tailrdError = this.createError({
      message: `Permission denied for action: ${action}`,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.PERMISSION,
      isRecoverable: false,
      userMessage: 'You do not have permission to perform this action.',
      context: { ...context, action }
    });
    this.handleError(tailrdError);
  }

  public handleClinicalDataError(error: Error, patientId?: string, context: Partial<ErrorContext> = {}): void {
    const tailrdError = this.createError({
      message: `Clinical Data Error: ${error.message}`,
      originalError: error,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.CLINICAL_DATA,
      isRecoverable: true,
      userMessage: 'Unable to access patient data. Please try again or contact support.',
      context: { ...context, patientId, action: 'Clinical Data Access' }
    });
    this.handleError(tailrdError);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();