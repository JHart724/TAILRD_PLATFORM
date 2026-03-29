import React from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export interface ClinicalAlertBannerProps {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  dismissible?: boolean;
  actions?: Array<{
 label: string;
 onClick: () => void;
 variant?: 'primary' | 'secondary';
  }>;
  moduleLink?: {
 label: string;
 href: string;
  };
  onDismiss?: (id: string) => void;
  className?: string;
}

const ClinicalAlertBanner: React.FC<ClinicalAlertBannerProps> = ({
  id,
  severity,
  title,
  message,
  dismissible = true,
  actions = [],
  moduleLink,
  onDismiss,
  className = '',
}) => {
  const getSeverityConfig = () => {
 switch (severity) {
 case 'critical':
 return {
 bgColor: 'bg-arterial-50 border-arterial-200',
 iconColor: 'text-arterial-600',
 titleColor: 'text-arterial-800',
 messageColor: 'text-arterial-700',
 icon: AlertTriangle,
 accentBorder: 'border-l-arterial-600'
 };
 case 'warning':
 return {
 bgColor: 'bg-[#F0F5FA] border-[#C8D4DC]',
 iconColor: 'text-[#6B7280]',
 titleColor: 'text-[#6B7280]',
 messageColor: 'text-[#6B7280]',
 icon: AlertTriangle,
 accentBorder: 'border-l-amber-500'
 };
 case 'info':
 return {
 bgColor: 'bg-chrome-50 border-chrome-200',
 iconColor: 'text-chrome-600',
 titleColor: 'text-chrome-800',
 messageColor: 'text-chrome-700',
 icon: Info,
 accentBorder: 'border-l-chrome-500'
 };
 default:
 return {
 bgColor: 'bg-[#C8D4DC] border-[#2C4A60]',
 iconColor: 'text-[#2C4A60]',
 titleColor: 'text-[#2C4A60]',
 messageColor: 'text-[#2C4A60]',
 icon: CheckCircle,
 accentBorder: 'border-l-green-500'
 };
 }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  const handleDismiss = () => {
 if (onDismiss) {
 onDismiss(id);
 }
  };

  const getActionButtonStyles = (variant: string = 'primary') => {
 switch (severity) {
 case 'critical':
 return variant === 'primary'
 ? 'bg-arterial-600 hover:bg-arterial-700 text-white'
 : 'bg-arterial-100 hover:bg-arterial-200 text-arterial-800';
 case 'warning':
 return variant === 'primary'
 ? 'bg-[#F0F5FA] hover:bg-[#F0F5FA] text-white'
 : 'bg-[#F0F5FA] hover:bg-[#F0F5FA] text-[#6B7280]';
 case 'info':
 return variant === 'primary'
 ? 'bg-chrome-600 hover:bg-chrome-700 text-white'
 : 'bg-chrome-100 hover:bg-chrome-200 text-chrome-800';
 default:
 return variant === 'primary'
 ? 'bg-[#C8D4DC] hover:bg-[#C8D4DC] text-white'
 : 'bg-[#C8D4DC] hover:bg-[#C8D4DC] text-[#2C4A60]';
 }
  };

  return (
 <div
 className={`
 relative
 border border-l-4
 rounded-lg
 p-4
 shadow-chrome-card
 transition-all
 duration-300
 ease-chrome
 ${config.bgColor}
 ${config.accentBorder}
 ${className}
 `}
 role="alert"
 aria-live={severity === 'critical' ? 'assertive' : 'polite'}
 >
 <div className="flex items-start gap-3">
 {/* Icon */}
 <div className={`flex-shrink-0 p-1 ${config.iconColor}`}>
 <Icon className="w-5 h-5" aria-hidden="true" />
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <h3 className={`font-body font-semibold text-sm ${config.titleColor} mb-1`}>
 {title}
 </h3>
 <p className={`text-sm font-body ${config.messageColor} leading-relaxed`}>
 {message}
 </p>

 {/* Actions and Module Link */}
 {(actions.length > 0 || moduleLink) && (
 <div className="flex flex-wrap items-center gap-2 mt-3">
 {/* Action Buttons */}
 {actions.map((action, index) => (
 <button
 key={action.label}
 onClick={action.onClick}
 className={`
 px-3 py-1.5
 text-xs font-body font-medium
 rounded-lg
 transition-colors
 duration-200
 ease-chrome
 ${getActionButtonStyles(action.variant)}
 `}
 >
 {action.label}
 </button>
 ))}

 {/* Module Link */}
 {moduleLink && (
 <a
 href={moduleLink.href}
 className={`
 px-3 py-1.5
 text-xs font-body font-medium
 rounded-lg
 underline
 transition-colors
 duration-200
 ease-chrome
 ${config.messageColor}
 hover:opacity-80
 `}
 >
 {moduleLink.label}
 </a>
 )}
 </div>
 )}
 </div>

 {/* Dismiss Button */}
 {dismissible && (
 <button
 onClick={handleDismiss}
 className={`
 flex-shrink-0
 p-1
 rounded-md
 transition-colors
 duration-200
 ease-chrome
 text-titanium-400
 hover:text-titanium-600
 hover:bg-titanium-100
 focus:outline-none
 focus:ring-2
 focus:ring-offset-1
 focus:ring-current
 `}
 aria-label={`Dismiss ${severity} alert: ${title}`}
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
  );
};

export default ClinicalAlertBanner;
