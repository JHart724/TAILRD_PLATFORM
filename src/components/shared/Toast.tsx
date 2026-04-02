import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
 label: string;
 onClick: () => void;
 variant?: 'primary' | 'secondary';
  }>;
  isRecoverable?: boolean;
  errorId?: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
 // Trigger entrance animation
 const timer = setTimeout(() => setIsVisible(true), 10);
 return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
 if (toast.duration && toast.duration > 0) {
 const timer = setTimeout(() => {
 handleDismiss();
 }, toast.duration);
 return () => clearTimeout(timer);
 }
  }, [toast.duration]);

  const handleDismiss = useCallback(() => {
 setIsLeaving(true);
 setTimeout(() => {
 onDismiss(toast.id);
 }, 200);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
 switch (toast.type) {
 case 'success':
 return <CheckCircle className="w-5 h-5" />;
 case 'error':
 return <AlertTriangle className="w-5 h-5" />;
 case 'warning':
 return <AlertCircle className="w-5 h-5" />;
 case 'info':
 default:
 return <Info className="w-5 h-5" />;
 }
  };

  const getAccentColor = () => {
 switch (toast.type) {
 case 'success':
 return 'bg-titanium-300';
 case 'error':
 return 'bg-arterial-600';
 case 'warning':
 return 'bg-chrome-50';
 case 'info':
 default:
 return 'bg-chrome-500';
 }
  };

  const getIconColor = () => {
 switch (toast.type) {
 case 'success':
 return 'text-teal-700';
 case 'error':
 return 'text-arterial-600';
 case 'warning':
 return 'text-gray-500';
 case 'info':
 default:
 return 'text-chrome-600';
 }
  };

  return (
 <div
 className={`transform transition-all duration-200 ease-chrome ${
 isVisible && !isLeaving
 ? 'translate-x-0 opacity-100 scale-100'
 : 'translate-x-full opacity-0 scale-95'
 }`}
 >
 <div
 className="max-w-sm w-full bg-white border border-titanium-200 rounded-lg shadow-chrome-elevated overflow-hidden flex"
 >
 {/* Left accent bar */}
 <div className={`w-1 flex-shrink-0 ${getAccentColor()}`} />

 <div className="flex items-start flex-1 p-4">
 <div className={`flex-shrink-0 ${getIconColor()}`}>
 {getIcon()}
 </div>

 <div className="ml-3 w-0 flex-1">
 <div className="text-sm font-body font-semibold text-titanium-900">
 {toast.title}
 </div>
 <div className="mt-1 text-sm font-body text-titanium-600">
 {toast.message}
 </div>

 {toast.errorId && (
 <div className="mt-2 text-xs font-data text-titanium-400">
 Error ID: {toast.errorId}
 </div>
 )}

 {toast.actions && toast.actions.length > 0 && (
 <div className="mt-3 flex gap-2">
 {toast.actions.map((action, index) => (
 <button
 key={action.label}
 onClick={action.onClick}
 className={`text-xs font-body font-medium px-3 py-1 rounded-md transition-colors ease-chrome ${
 action.variant === 'primary'
 ? 'bg-chrome-600 text-white hover:bg-chrome-700'
 : 'text-titanium-600 hover:text-titanium-800 hover:underline'
 }`}
 >
 {action.label}
 </button>
 ))}
 </div>
 )}
 </div>

 <div className="ml-4 flex-shrink-0 flex">
 <button
 onClick={handleDismiss}
 className="inline-flex text-titanium-400 hover:text-titanium-600 transition-colors ease-chrome focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-chrome-500 rounded-md"
 >
 <span className="sr-only">Close</span>
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
 const newToast: ToastData = {
 ...toast,
 id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 duration: toast.duration ?? 4000 // Default 4 seconds
 };

 setToasts(prev => {
 const updated = [newToast, ...prev];
 return updated.slice(0, maxToasts);
 });
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
 setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
 setToasts([]);
  }, []);

  // Listen for error events from ErrorHandler
  useEffect(() => {
 const handleErrorEvent = (event: CustomEvent) => {
 const notification = event.detail;
 addToast({
 type: notification.type,
 title: notification.title,
 message: notification.message,
 errorId: notification.errorId,
 isRecoverable: notification.isRecoverable,
 actions: notification.actions?.map((action: string) => ({
 label: action,
 onClick: () => {
 // Default action handlers
 if (action.includes('Retry')) {
 window.location.reload();
 } else if (action.includes('support')) {
 // Open support contact
 console.log('Contact support clicked');
 }
 }
 }))
 });
 };

 window.addEventListener('tailrd-error', handleErrorEvent as EventListener);
 return () => {
 window.removeEventListener('tailrd-error', handleErrorEvent as EventListener);
 };
  }, [addToast]);

  // Expose toast functions globally
  useEffect(() => {
 (window as any).addToast = addToast;
 (window as any).clearToasts = clearAllToasts;

 return () => {
 delete (window as any).addToast;
 delete (window as any).clearToasts;
 };
  }, [addToast, clearAllToasts]);

  const getPositionClasses = () => {
 switch (position) {
 case 'top-left':
 return 'top-4 left-4';
 case 'top-center':
 return 'top-4 left-1/2 transform -translate-x-1/2';
 case 'top-right':
 return 'top-4 right-4';
 case 'bottom-left':
 return 'bottom-4 left-4';
 case 'bottom-center':
 return 'bottom-4 left-1/2 transform -translate-x-1/2';
 case 'bottom-right':
 return 'bottom-4 right-4';
 default:
 return 'top-4 right-4';
 }
  };

  if (toasts.length === 0) return null;

  return (
 <div className={`fixed ${getPositionClasses()} z-50 space-y-2`}>
 {toasts.map(toast => (
 <Toast
 key={toast.id}
 toast={toast}
 onDismiss={removeToast}
 />
 ))}
 </div>
  );
};

// Toast utility functions for easy use
export const toast = {
  success: (title: string, message: string, options?: Partial<ToastData>) => {
 if ((window as any).addToast) {
 (window as any).addToast({ type: 'success', title, message, ...options });
 }
  },
  error: (title: string, message: string, options?: Partial<ToastData>) => {
 if ((window as any).addToast) {
 (window as any).addToast({ type: 'error', title, message, duration: 8000, ...options });
 }
  },
  warning: (title: string, message: string, options?: Partial<ToastData>) => {
 if ((window as any).addToast) {
 (window as any).addToast({ type: 'warning', title, message, duration: 6000, ...options });
 }
  },
  info: (title: string, message: string, options?: Partial<ToastData>) => {
 if ((window as any).addToast) {
 (window as any).addToast({ type: 'info', title, message, ...options });
 }
  },
  clear: () => {
 if ((window as any).clearToasts) {
 (window as any).clearToasts();
 }
  }
};

export default Toast;
