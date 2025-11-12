import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, TrendingUp, X } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'opportunity';
  title: string;
  description: string;
  value: string;
  patientCount?: number;
  patients?: Array<{ name: string; mrn: string; risk: number }>;
}

const alerts: Alert[] = [
  {
    id: 'critical-1',
    type: 'critical',
    title: 'High-Risk Patients Not on GDMT',
    description: 'Expected 8 readmissions this month',
    value: '$180K cost',
    patientCount: 23,
    patients: [
      { name: 'Patient A', mrn: 'MRN001', risk: 92 },
      { name: 'Patient B', mrn: 'MRN002', risk: 89 },
      { name: 'Patient C', mrn: 'MRN003', risk: 85 }
    ]
  },
  {
    id: 'warning-1',
    type: 'warning',
    title: 'Medication Titration Opportunities',
    description: 'Patients with suboptimal dosing',
    value: '47 patients',
    patientCount: 47
  },
  {
    id: 'opportunity-1',
    type: 'opportunity',
    title: 'Device Therapy Candidates',
    description: 'CRT/ICD eligible patients',
    value: '$2.1M revenue',
    patientCount: 12
  }
];

const HFRiskAlerts: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'opportunity': return TrendingUp;
      default: return AlertCircle;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-700';
      case 'warning': return 'border-amber-500 bg-amber-50 text-amber-700';
      case 'opportunity': return 'border-green-500 bg-green-50 text-green-700';
      default: return 'border-gray-500 bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-steel-900">Real-Time Risk Alerts</h3>
      
      {alerts.map((alert) => {
        const Icon = getAlertIcon(alert.type);
        
        return (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${getAlertColor(alert.type)}`}
            onClick={() => setSelectedAlert(alert)}
          >
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold">{alert.title}</h4>
                <p className="text-sm opacity-80">{alert.description}</p>
                <div className="mt-2 flex items-center gap-4">
                  <span className="font-bold">{alert.value}</span>
                  {alert.patientCount && (
                    <span className="text-sm">({alert.patientCount} patients)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{selectedAlert.title}</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">{selectedAlert.description}</p>
            <p className="font-semibold text-lg mb-4">{selectedAlert.value}</p>
            
            {selectedAlert.patients && (
              <div>
                <h4 className="font-semibold mb-2">Affected Patients:</h4>
                <div className="space-y-2">
                  {selectedAlert.patients.map((patient, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{patient.name} ({patient.mrn})</span>
                      <span className="text-red-600">Risk: {patient.risk}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HFRiskAlerts;