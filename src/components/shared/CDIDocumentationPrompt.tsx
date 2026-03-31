import React from 'react';
import { FileText, AlertCircle, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { toFixed } from '../../utils/formatters';

export interface CDIAlert {
  patientId: string;
  patientName: string;
  mrn: string;
  currentDiagnoses: string[];
  suggestedAdditions: string[];
  impactAnalysis: {
 severityChange: number;
 mortalityChange: number;
 reimbursementImpact: number;
 cmiImpact: number;
  };
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  physicianName?: string;
  currentDRG?: string;
  potentialDRG?: string;
}

interface CDIDocumentationPromptProps {
  cdiAlerts: CDIAlert[];
  title?: string;
  maxVisible?: number;
  showActions?: boolean;
}

const CDIDocumentationPrompt: React.FC<CDIDocumentationPromptProps> = ({ 
  cdiAlerts, 
  title = "CDI Documentation Opportunities",
  maxVisible = 4,
  showActions = true
}) => {
  if (cdiAlerts.length === 0) return null;

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
 switch (priority) {
 case 'high': return 'border-l-medical-red-400 bg-medical-red-50/50';
 case 'medium': return 'border-l-crimson-400 bg-crimson-50';
 case 'low': return 'border-l-porsche-400 bg-porsche-50/50';
 }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
 switch (priority) {
 case 'high': return <AlertCircle className="w-4 h-4 text-medical-red-600" />;
 case 'medium': return <Clock className="w-4 h-4 text-crimson-600" />;
 case 'low': return <FileText className="w-4 h-4 text-porsche-600" />;
 }
  };

  const getDaysUntilDue = (dueDate: string) => {
 const due = new Date(dueDate);
 const today = new Date();
 const diffTime = due.getTime() - today.getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 return diffDays;
  };

  const totalRevenueImpact = cdiAlerts.reduce((sum, cdiAlert) => sum + cdiAlert.impactAnalysis.reimbursementImpact, 0);
  const highPriorityCount = cdiAlerts.filter(cdiAlert => cdiAlert.priority === 'high').length;

  return (
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-gradient-to-r from-titanium-50 to-crimson-50/40">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 mb-2 flex items-center gap-2">
 <FileText className="w-5 h-5 text-crimson-600" />
 {title}
 </h3>
 <p className="text-sm text-titanium-600">Clinical documentation improvement cdiAlerts</p>
 </div>
 <div className="text-right">
 <div className="text-2xl font-bold text-[#2C4A60]">
 +${totalRevenueImpact.toLocaleString()}
 </div>
 <div className="text-xs text-titanium-500">Potential Revenue Impact</div>
 {highPriorityCount > 0 && (
 <div className="text-sm text-medical-red-600 font-medium mt-1">
 {highPriorityCount} urgent cdiAlert{highPriorityCount > 1 ? 's' : ''}
 </div>
 )}
 </div>
 </div>
 </div>
 
 <div className="p-6 space-y-4">
 {cdiAlerts.slice(0, maxVisible).map((cdiAlert, index) => {
 const daysUntilDue = getDaysUntilDue(cdiAlert.dueDate);
 const isOverdue = daysUntilDue < 0;
 const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
 
 return (
 <div key={cdiAlert.patientId} className={`metal-card p-4 border-l-4 ${getPriorityColor(cdiAlert.priority)}`}>
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 {getPriorityIcon(cdiAlert.priority)}
 <span className="font-semibold text-titanium-900">{cdiAlert.patientName}</span>
 <span className="text-sm text-titanium-600">• {cdiAlert.mrn}</span>
 {cdiAlert.physicianName && (
 <span className="text-sm text-titanium-600">• {cdiAlert.physicianName}</span>
 )}
 <span className={`text-xs px-2 py-1 rounded-full font-medium ${
 cdiAlert.priority === 'high' ? 'bg-medical-red-100 text-medical-red-800' :
 cdiAlert.priority === 'medium' ? 'bg-crimson-100 text-crimson-700' :
 'bg-porsche-100 text-porsche-800'
 }`}>
 {cdiAlert.priority.toUpperCase()}
 </span>
 </div>
 
 {cdiAlert.currentDRG && cdiAlert.potentialDRG && (
 <div className="text-sm text-titanium-700 mb-2">
 <span className="font-medium">DRG Impact:</span> {cdiAlert.currentDRG} → {cdiAlert.potentialDRG}
 </div>
 )}
 
 <div className="text-sm text-titanium-700 mb-2">
 <div className="font-medium text-titanium-800">Current Diagnoses:</div>
 <div className="text-titanium-600">{cdiAlert.currentDiagnoses.join(', ')}</div>
 </div>
 
 <div className="text-sm text-titanium-700 mb-3">
 <div className="font-medium text-[#2C4A60]">Suggested Documentation:</div>
 <div className="text-titanium-600">{cdiAlert.suggestedAdditions.join(', ')}</div>
 </div>
 
 <div className="flex items-center gap-4 text-xs">
 <div className={`flex items-center gap-1 ${
 isOverdue ? 'text-medical-red-600' : 
 isUrgent ? 'text-crimson-600' : 
 'text-titanium-500'
 }`}>
 <Clock className="w-3 h-3" />
 {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
 isUrgent ? `${daysUntilDue} days remaining` : 
 `Due in ${daysUntilDue} days`}
 </div>
 <div className="text-titanium-500">
 CMI Impact: +{toFixed(cdiAlert.impactAnalysis.cmiImpact, 2)}
 </div>
 </div>
 </div>
 
 <div className="text-right ml-4">
 <div className="text-lg font-bold text-[#2C4A60] flex items-center gap-1">
 <DollarSign className="w-4 h-4" />
 +{cdiAlert.impactAnalysis.reimbursementImpact.toLocaleString()}
 </div>
 <div className="text-xs text-titanium-500 mb-2">Revenue Impact</div>
 
 {showActions && (
 <div className="space-y-1">
 <button 
 className="text-xs bg-porsche-100 text-porsche-800 px-2 py-1 rounded hover:bg-porsche-200 transition-colors"
 onClick={() => {
 console.log('Sending CDI query for patient:', cdiAlert.patientName);
 // TODO: Implement CDI query workflow
 {}
 }}
 >
 Send Query
 </button>
 <button 
 className="text-xs bg-[#F0F7F4] text-[#2D6147] px-2 py-1 rounded hover:bg-[#C8D4DC] transition-colors block"
 onClick={() => {
 console.log('Marking CDI cdiAlert complete for patient:', cdiAlert.patientName);
 // TODO: Implement CDI completion workflow
 {}
 }}
 >
 Mark Complete
 </button>
 </div>
 )}
 </div>
 </div>
 
 {/* Impact Summary */}
 <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-titanium-200">
 <div className="text-center">
 <div className="text-sm font-medium text-titanium-800">Severity</div>
 <div className={`text-sm ${cdiAlert.impactAnalysis.severityChange > 0 ? 'text-crimson-600' : 'text-titanium-600'}`}>
 {cdiAlert.impactAnalysis.severityChange > 0 ? '+' : ''}{cdiAlert.impactAnalysis.severityChange}
 </div>
 </div>
 <div className="text-center">
 <div className="text-sm font-medium text-titanium-800">Mortality</div>
 <div className={`text-sm ${cdiAlert.impactAnalysis.mortalityChange > 0 ? 'text-medical-red-600' : 'text-titanium-600'}`}>
 {cdiAlert.impactAnalysis.mortalityChange > 0 ? '+' : ''}{cdiAlert.impactAnalysis.mortalityChange}
 </div>
 </div>
 <div className="text-center">
 <div className="text-sm font-medium text-titanium-800">CMI</div>
 <div className="text-sm text-[#2C4A60]">
 +{toFixed(cdiAlert.impactAnalysis.cmiImpact, 2)}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 
 {cdiAlerts.length > maxVisible && (
 <div className="text-center py-2 text-sm text-titanium-500">
 +{cdiAlerts.length - maxVisible} more CDI opportunities available
 </div>
 )}
 
 {/* Action Summary */}
 {showActions && (
 <div className="bg-[#f0f5fa] rounded-lg p-4 border border-[#C8D4DC]">
 <div className="flex items-center justify-between">
 <div>
 <div className="font-semibold text-[#2C4A60] flex items-center gap-2">
 <CheckCircle className="w-4 h-4" />
 CDI Team Actions
 </div>
 <div className="text-sm text-[#2C4A60] mt-1">
 • Schedule physician queries for high-priority cases
 • Review documentation templates with care teams
 • Coordinate with coding staff for clarification
 </div>
 </div>
 <div className="text-right">
 <div className="text-lg font-bold text-[#2C4A60]">
 {cdiAlerts.length} Active
 </div>
 <div className="text-xs text-titanium-600">Total Alerts</div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
  );
};

export default CDIDocumentationPrompt;