import React from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  User, 
  Calendar, 
  AlertTriangle,
  PlayCircle,
  Eye,
  ThumbsUp,
  Pause
} from 'lucide-react';

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  completedAt?: string;
  completedBy?: string;
  estimatedDuration?: string;
  notes?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface ReferralWorkflowProps {
  referralId: string;
  patientName: string;
  fromModule: string;
  toModule: string;
  currentStep: number;
  steps: WorkflowStep[];
  urgency: 'emergent' | 'urgent' | 'routine';
  createdAt: string;
  className?: string;
}

const ReferralWorkflow: React.FC<ReferralWorkflowProps> = ({
  referralId,
  patientName,
  fromModule,
  toModule,
  currentStep,
  steps,
  urgency,
  createdAt,
  className = '',
}) => {
  const getUrgencyConfig = (urgency: string) => {
 switch (urgency) {
 case 'emergent':
 return {
 color: 'text-medical-red-600',
 bgColor: 'bg-medical-red-50',
 borderColor: 'border-medical-red-200',
 accentColor: 'bg-medical-red-500'
 };
 case 'urgent':
 return {
 color: 'text-crimson-600',
 bgColor: 'bg-crimson-50',
 borderColor: 'border-crimson-200',
 accentColor: 'bg-crimson-500'
 };
 case 'routine':
 return {
 color: 'text-porsche-600',
 bgColor: 'bg-porsche-50',
 borderColor: 'border-porsche-200',
 accentColor: 'bg-porsche-500'
 };
 default:
 return {
 color: 'text-titanium-600',
 bgColor: 'bg-titanium-50',
 borderColor: 'border-titanium-200',
 accentColor: 'bg-titanium-500'
 };
 }
  };

  const getStepIcon = (step: WorkflowStep, index: number) => {
 switch (step.status) {
 case 'completed':
 return <CheckCircle className="w-5 h-5 text-teal-700 fill-current" />;
 case 'current':
 return <PlayCircle className="w-5 h-5 text-porsche-500 fill-current animate-pulse" />;
 case 'pending':
 return <Circle className="w-5 h-5 text-titanium-400" />;
 case 'skipped':
 return <Pause className="w-5 h-5 text-titanium-400" />;
 default:
 return <Circle className="w-5 h-5 text-titanium-400" />;
 }
  };

  const getStepConfig = (step: WorkflowStep, index: number) => {
 switch (step.status) {
 case 'completed':
 return {
 bgColor: 'bg-chrome-50',
 borderColor: 'border-titanium-300',
 textColor: 'text-titanium-700',
 titleColor: 'text-titanium-800'
 };
 case 'current':
 return {
 bgColor: 'bg-porsche-50/80',
 borderColor: 'border-porsche-300',
 textColor: 'text-porsche-700',
 titleColor: 'text-porsche-800'
 };
 case 'pending':
 return {
 bgColor: 'bg-titanium-50',
 borderColor: 'border-titanium-200',
 textColor: 'text-titanium-500',
 titleColor: 'text-titanium-600'
 };
 case 'skipped':
 return {
 bgColor: 'bg-titanium-50',
 borderColor: 'border-titanium-200',
 textColor: 'text-titanium-400',
 titleColor: 'text-titanium-500'
 };
 default:
 return {
 bgColor: 'bg-titanium-50',
 borderColor: 'border-titanium-200',
 textColor: 'text-titanium-500',
 titleColor: 'text-titanium-600'
 };
 }
  };

  const urgencyConfig = getUrgencyConfig(urgency);

  const formatDateTime = (dateString: string) => {
 const date = new Date(dateString);
 return {
 date: date.toLocaleDateString(),
 time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
 };
  };

  const getTimeSinceCreation = () => {
 const hours = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
 if (hours < 24) return `${hours}h`;
 const days = Math.floor(hours / 24);
 return `${days}d`;
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
 <div className={`retina-card ${className}`}>
 {/* Header */}
 <div className="p-6 border-b border-titanium-100">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <h2 className="text-lg font-bold text-titanium-800 mb-1">
 Referral Workflow
 </h2>
 <p className="text-titanium-600">
 {patientName} • {fromModule} → {toModule}
 </p>
 </div>
 
 <div className="text-right">
 <div className={`px-2 py-1 text-xs font-medium rounded-full ${urgencyConfig.color} ${urgencyConfig.bgColor} border ${urgencyConfig.borderColor}`}>
 {urgency.toUpperCase()}
 </div>
 <div className="text-xs text-titanium-500 mt-1">
 Created {getTimeSinceCreation()} ago
 </div>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="mb-4">
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm font-medium text-titanium-700">
 Progress: {completedSteps} of {steps.length} steps completed
 </span>
 <span className="text-sm text-titanium-600">
 {Math.round(progressPercentage)}%
 </span>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div 
 className={`h-2 rounded-full transition-all duration-500 ease-out ${urgencyConfig.accentColor}`}
 style={{ width: `${progressPercentage}%` }}
 />
 </div>
 </div>

 {/* Current Status */}
 <div className="flex items-center gap-2 text-sm">
 <div className="flex items-center gap-1">
 <PlayCircle className="w-4 h-4 text-porsche-500" />
 <span className="font-medium text-titanium-700">Current:</span>
 </div>
 <span className="text-titanium-800">
 {steps[currentStep]?.name || 'Workflow Complete'}
 </span>
 </div>
 </div>

 {/* Steps */}
 <div className="p-6">
 <div className="space-y-4">
 {steps.map((step, index) => {
 const stepConfig = getStepConfig(step, index);
 const isLast = index === steps.length - 1;
 
 return (
 <div key={step.id} className="relative">
 {/* Connection Line */}
 {!isLast && (
 <div className="absolute left-6 top-8 w-0.5 h-12 bg-titanium-200" />
 )}
 
 <div className={`
 flex gap-4 p-4 rounded-xl border-2 transition-all duration-200
 ${stepConfig.bgColor} 
 ${stepConfig.borderColor}
 ${step.status === 'current' ? 'shadow-chrome-card' : ''}
 `}>
 {/* Icon */}
 <div className="flex-shrink-0 pt-0.5">
 {getStepIcon(step, index)}
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <h3 className={`font-semibold text-sm mb-1 ${stepConfig.titleColor}`}>
 {index + 1}. {step.name}
 </h3>
 
 {/* Completion Details */}
 {step.status === 'completed' && step.completedAt && (
 <div className="flex items-center gap-4 text-xs text-titanium-600 mb-2">
 <div className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 <span>
 {formatDateTime(step.completedAt).date} at {formatDateTime(step.completedAt).time}
 </span>
 </div>
 {step.completedBy && (
 <div className="flex items-center gap-1">
 <User className="w-3 h-3" />
 <span>{step.completedBy}</span>
 </div>
 )}
 </div>
 )}

 {/* Current Step Details */}
 {step.status === 'current' && (
 <div className="space-y-1 mb-2">
 {step.assignedTo && (
 <div className="flex items-center gap-1 text-xs text-porsche-600">
 <User className="w-3 h-3" />
 <span>Assigned to: {step.assignedTo}</span>
 </div>
 )}
 {step.dueDate && (
 <div className="flex items-center gap-1 text-xs text-porsche-600">
 <Clock className="w-3 h-3" />
 <span>Due: {formatDateTime(step.dueDate).date}</span>
 </div>
 )}
 {step.estimatedDuration && (
 <div className="text-xs text-titanium-500">
 Estimated duration: {step.estimatedDuration}
 </div>
 )}
 </div>
 )}

 {/* Pending Step Details */}
 {step.status === 'pending' && step.estimatedDuration && (
 <div className="text-xs text-titanium-500 mb-2">
 Estimated duration: {step.estimatedDuration}
 </div>
 )}

 {/* Notes */}
 {step.notes && (
 <div className="text-xs text-titanium-600 bg-white p-2 rounded border border-titanium-200">
 <span className="font-medium">Notes:</span> {step.notes}
 </div>
 )}
 </div>

 {/* Step Status Badge */}
 <div className="flex-shrink-0 ml-4">
 {step.status === 'completed' && (
 <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-100">
 <CheckCircle className="w-3 h-3" />
 Complete
 </div>
 )}
 {step.status === 'current' && (
 <div className="flex items-center gap-1 px-2 py-1 bg-porsche-100 text-porsche-700 text-xs rounded-full border border-porsche-200 animate-pulse">
 <PlayCircle className="w-3 h-3" />
 In Progress
 </div>
 )}
 {step.status === 'pending' && (
 <div className="flex items-center gap-1 px-2 py-1 bg-titanium-100 text-titanium-600 text-xs rounded-full border border-titanium-200">
 <Clock className="w-3 h-3" />
 Pending
 </div>
 )}
 {step.status === 'skipped' && (
 <div className="flex items-center gap-1 px-2 py-1 bg-titanium-100 text-titanium-500 text-xs rounded-full border border-titanium-200">
 <Pause className="w-3 h-3" />
 Skipped
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Action Buttons (if current user can take action) */}
 {currentStep < steps.length && steps[currentStep]?.status === 'current' && (
 <div className="mt-6 pt-4 border-t border-titanium-200">
 <div className="flex justify-between items-center">
 <div className="text-sm text-titanium-600">
 Next action required for: <span className="font-medium">{steps[currentStep].name}</span>
 </div>
 
 <div className="flex gap-2">
 <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-titanium-600 hover:text-titanium-700 hover:bg-titanium-100 rounded-lg transition-colors border border-titanium-200">
 <Eye className="w-4 h-4" />
 View Details
 </button>
 
 {steps[currentStep].assignedTo && (
 <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-porsche-600 hover:text-porsche-700 hover:bg-porsche-50 rounded-lg transition-colors border border-porsche-200">
 <ThumbsUp className="w-4 h-4" />
 Mark Complete
 </button>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Completed Workflow */}
 {currentStep >= steps.length && (
 <div className="mt-6 pt-4 border-t border-titanium-200">
 <div className="flex items-center justify-center gap-2 text-teal-700">
 <CheckCircle className="w-5 h-5" />
 <span className="font-medium">Workflow Complete</span>
 </div>
 </div>
 )}
 </div>
 </div>
  );
};

export default ReferralWorkflow;