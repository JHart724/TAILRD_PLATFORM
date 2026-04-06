import React from 'react';
import { TrendingUp, AlertTriangle, DollarSign, Clock } from 'lucide-react';

export interface DRGOpportunity {
  currentDRG: string;
  currentDRGDescription: string;
  potentialDRG: string;
  potentialDRGDescription: string;
  revenueImpact: number;
  documentationNeeded: string[];
  confidence: number;
  timeframe: string;
  priority: 'high' | 'medium' | 'low';
  patientName?: string;
  mrn?: string;
}

interface DRGOptimizationAlertProps {
  opportunities: DRGOpportunity[];
  title?: string;
  maxVisible?: number;
  showPatientInfo?: boolean;
  onOpportunityClick?: (opportunity: DRGOpportunity) => void;
}

const DRGOptimizationAlert: React.FC<DRGOptimizationAlertProps> = ({ 
  opportunities, 
  title = "DRG Optimization Opportunities",
  maxVisible = 3,
  showPatientInfo = false,
  onOpportunityClick
}) => {
  if (opportunities.length === 0) return null;

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
 switch (priority) {
 case 'high': return 'border-medical-red-300 bg-medical-red-50';
 case 'medium': return 'border-crimson-200 bg-crimson-50';
 case 'low': return 'border-porsche-300 bg-porsche-50';
 }
  };

  const getConfidenceColor = (confidence: number) => {
 if (confidence >= 90) return 'bg-green-50 text-green-600';
 if (confidence >= 75) return 'bg-crimson-100 text-crimson-700';
 return 'bg-medical-red-100 text-medical-red-800';
  };

  const totalPotentialRevenue = opportunities.reduce((sum, opp) => sum + opp.revenueImpact, 0);

  return (
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-gradient-to-r from-titanium-50 to-[#f0f5fa]/40">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 mb-2 flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-teal-700" />
 {title}
 </h3>
 <p className="text-sm text-titanium-600">Real-time identification of coding improvements</p>
 </div>
 <div className="text-right">
 <div className="text-2xl font-bold text-teal-700">
 +${totalPotentialRevenue.toLocaleString()}
 </div>
 <div className="text-xs text-titanium-500">Total Opportunity</div>
 </div>
 </div>
 </div>
 
 <div className="p-6 space-y-4">
 {opportunities.slice(0, maxVisible).map((opportunity, index) => (
 <div 
 key={`${opportunity.currentDRG}-${opportunity.potentialDRG}`}
 className={`rounded-lg p-4 border-2 ${getPriorityColor(opportunity.priority)} ${
 onOpportunityClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
 }`}
 onClick={() => onOpportunityClick && onOpportunityClick(opportunity)}
 >
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 {showPatientInfo && opportunity.patientName && (
 <div className="text-sm font-medium text-titanium-900 mb-1">
 {opportunity.patientName} {opportunity.mrn && `• ${opportunity.mrn}`}
 </div>
 )}
 <div className="flex items-center gap-2 mb-2">
 <span className="text-sm font-semibold text-teal-700">
 DRG {opportunity.currentDRG} → {opportunity.potentialDRG}
 </span>
 <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(opportunity.confidence)}`}>
 {opportunity.confidence}% Confidence
 </span>
 <span className={`text-xs px-2 py-1 rounded-full font-medium ${
 opportunity.priority === 'high' ? 'bg-medical-red-100 text-medical-red-800' :
 opportunity.priority === 'medium' ? 'bg-crimson-100 text-crimson-700' :
 'bg-porsche-100 text-porsche-800'
 }`}>
 {opportunity.priority.toUpperCase()} PRIORITY
 </span>
 </div>
 <div className="text-xs text-titanium-700 mb-2">
 <div className="font-medium">Current: {opportunity.currentDRGDescription}</div>
 <div className="font-medium text-teal-700">Potential: {opportunity.potentialDRGDescription}</div>
 </div>
 <div className="text-xs text-titanium-600 mb-2">
 <strong>Documentation needed:</strong> {opportunity.documentationNeeded.join(', ')}
 </div>
 <div className="flex items-center gap-4 text-xs text-titanium-500">
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 Due in {opportunity.timeframe}
 </div>
 {opportunity.priority === 'high' && (
 <div className="flex items-center gap-1 text-medical-red-600">
 <AlertTriangle className="w-3 h-3" />
 Urgent Review Required
 </div>
 )}
 </div>
 </div>
 <div className="text-right ml-4">
 <div className="text-lg font-bold text-teal-700 flex items-center gap-1">
 <DollarSign className="w-4 h-4" />
 +{opportunity.revenueImpact.toLocaleString()}
 </div>
 <div className="text-xs text-titanium-500">Revenue Impact</div>
 </div>
 </div>
 </div>
 ))}
 
 {opportunities.length > maxVisible && (
 <div className="text-center py-2 text-sm text-titanium-500">
 +{opportunities.length - maxVisible} more opportunities available
 </div>
 )}
 
 {/* Summary Card */}
 <div className="bg-porsche-50 rounded-lg p-4 border border-porsche-200">
 <div className="flex items-center justify-between">
 <div>
 <div className="font-semibold text-porsche-900">Quick Actions</div>
 <div className="text-sm text-porsche-700">
 • Review high-priority documentation gaps
 • Coordinate with CDI team for complex cases
 • Schedule physician queries for clarification
 </div>
 </div>
 <div className="text-right">
 <div className="text-sm font-medium text-porsche-800">
 {opportunities.filter(o => o.priority === 'high').length} High Priority
 </div>
 <div className="text-xs text-titanium-600">
 Avg Confidence: {Math.round(opportunities.reduce((sum, o) => sum + o.confidence, 0) / opportunities.length)}%
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default DRGOptimizationAlert;