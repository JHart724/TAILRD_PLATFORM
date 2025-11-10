import React from 'react';
import { FileText, AlertCircle, Clock, DollarSign, CheckCircle } from 'lucide-react';

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
      case 'medium': return 'border-l-medical-amber-400 bg-medical-amber-50/50';
      case 'low': return 'border-l-medical-blue-400 bg-medical-blue-50/50';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-medical-red-600" />;
      case 'medium': return <Clock className="w-4 h-4 text-medical-amber-600" />;
      case 'low': return <FileText className="w-4 h-4 text-medical-blue-600" />;
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
    <div className="retina-card">
      <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-amber-50/40">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-steel-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-medical-amber-600" />
              {title}
            </h3>
            <p className="text-sm text-steel-600">Clinical documentation improvement cdiAlerts</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-medical-green-700">
              +${totalRevenueImpact.toLocaleString()}
            </div>
            <div className="text-xs text-steel-500">Potential Revenue Impact</div>
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
            <div key={index} className={`retina-card p-4 border-l-4 ${getPriorityColor(cdiAlert.priority)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getPriorityIcon(cdiAlert.priority)}
                    <span className="font-semibold text-steel-900">{cdiAlert.patientName}</span>
                    <span className="text-sm text-steel-600">• {cdiAlert.mrn}</span>
                    {cdiAlert.physicianName && (
                      <span className="text-sm text-steel-600">• {cdiAlert.physicianName}</span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      cdiAlert.priority === 'high' ? 'bg-medical-red-100 text-medical-red-800' :
                      cdiAlert.priority === 'medium' ? 'bg-medical-amber-100 text-medical-amber-800' :
                      'bg-medical-blue-100 text-medical-blue-800'
                    }`}>
                      {cdiAlert.priority.toUpperCase()}
                    </span>
                  </div>
                  
                  {cdiAlert.currentDRG && cdiAlert.potentialDRG && (
                    <div className="text-sm text-steel-700 mb-2">
                      <span className="font-medium">DRG Impact:</span> {cdiAlert.currentDRG} → {cdiAlert.potentialDRG}
                    </div>
                  )}
                  
                  <div className="text-sm text-steel-700 mb-2">
                    <div className="font-medium text-steel-800">Current Diagnoses:</div>
                    <div className="text-steel-600">{cdiAlert.currentDiagnoses.join(', ')}</div>
                  </div>
                  
                  <div className="text-sm text-steel-700 mb-3">
                    <div className="font-medium text-medical-green-800">Suggested Documentation:</div>
                    <div className="text-steel-600">{cdiAlert.suggestedAdditions.join(', ')}</div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs">
                    <div className={`flex items-center gap-1 ${
                      isOverdue ? 'text-medical-red-600' : 
                      isUrgent ? 'text-medical-amber-600' : 
                      'text-steel-500'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                       isUrgent ? `${daysUntilDue} days remaining` : 
                       `Due in ${daysUntilDue} days`}
                    </div>
                    <div className="text-steel-500">
                      CMI Impact: +{cdiAlert.impactAnalysis.cmiImpact.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-medical-green-700 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    +{cdiAlert.impactAnalysis.reimbursementImpact.toLocaleString()}
                  </div>
                  <div className="text-xs text-steel-500 mb-2">Revenue Impact</div>
                  
                  {showActions && (
                    <div className="space-y-1">
                      <button 
                        className="text-xs bg-medical-blue-100 text-medical-blue-800 px-2 py-1 rounded hover:bg-medical-blue-200 transition-colors"
                        onClick={() => {
                          console.log('Sending CDI query for patient:', cdiAlert.patientName);
                          // TODO: Implement CDI query workflow
                          window.alert(`Send CDI Query - Physician query for ${cdiAlert.patientName} (${cdiAlert.mrn})`);
                        }}
                      >
                        Send Query
                      </button>
                      <button 
                        className="text-xs bg-medical-green-100 text-medical-green-800 px-2 py-1 rounded hover:bg-medical-green-200 transition-colors block"
                        onClick={() => {
                          console.log('Marking CDI cdiAlert complete for patient:', cdiAlert.patientName);
                          // TODO: Implement CDI completion workflow
                          window.alert(`Mark Complete - CDI alert for ${cdiAlert.patientName} has been marked as complete`);
                        }}
                      >
                        Mark Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Impact Summary */}
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-steel-200">
                <div className="text-center">
                  <div className="text-sm font-medium text-steel-800">Severity</div>
                  <div className={`text-sm ${cdiAlert.impactAnalysis.severityChange > 0 ? 'text-medical-amber-600' : 'text-steel-600'}`}>
                    {cdiAlert.impactAnalysis.severityChange > 0 ? '+' : ''}{cdiAlert.impactAnalysis.severityChange}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-steel-800">Mortality</div>
                  <div className={`text-sm ${cdiAlert.impactAnalysis.mortalityChange > 0 ? 'text-medical-red-600' : 'text-steel-600'}`}>
                    {cdiAlert.impactAnalysis.mortalityChange > 0 ? '+' : ''}{cdiAlert.impactAnalysis.mortalityChange}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-steel-800">CMI</div>
                  <div className="text-sm text-medical-green-600">
                    +{cdiAlert.impactAnalysis.cmiImpact.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {cdiAlerts.length > maxVisible && (
          <div className="text-center py-2 text-sm text-steel-500">
            +{cdiAlerts.length - maxVisible} more CDI opportunities available
          </div>
        )}
        
        {/* Action Summary */}
        {showActions && (
          <div className="bg-medical-green-50 rounded-lg p-4 border border-medical-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-medical-green-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  CDI Team Actions
                </div>
                <div className="text-sm text-medical-green-700 mt-1">
                  • Schedule physician queries for high-priority cases
                  • Review documentation templates with care teams
                  • Coordinate with coding staff for clarification
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-medical-green-800">
                  {cdiAlerts.length} Active
                </div>
                <div className="text-xs text-steel-600">Total Alerts</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CDIDocumentationPrompt;