import React from 'react';
import { X } from 'lucide-react';

interface WorklistPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  lvef: number;
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
  priority: 'high' | 'medium' | 'low';
  gdmtGaps: string[];
  deviceEligible: boolean;
  lastVisit: string;
  nextAppointment?: string;
  assignedProvider: string;
  recentAdmission: boolean;
  actionItems: {
    category: 'GDMT' | 'Device' | 'Lab' | 'Follow-up';
    description: string;
    dueDate: string;
    urgent: boolean;
  }[];
  riskScore: number;
  phenotype?: string;
}

interface PatientDetailPanelProps {
  patient: WorklistPatient;
  onClose: () => void;
}

const PatientDetailPanel: React.FC<PatientDetailPanelProps> = ({ patient, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-steel-200">
          <h2 className="text-xl font-bold text-steel-900">Patient Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-steel-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-steel-600" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-steel-600">Name</div>
              <div className="font-semibold text-steel-900">{patient.name}</div>
            </div>
            <div>
              <div className="text-sm text-steel-600">MRN</div>
              <div className="font-semibold text-steel-900">{patient.mrn}</div>
            </div>
            <div>
              <div className="text-sm text-steel-600">Age</div>
              <div className="font-semibold text-steel-900">{patient.age}</div>
            </div>
            <div>
              <div className="text-sm text-steel-600">Ejection Fraction</div>
              <div className="font-semibold text-steel-900">{patient.lvef}%</div>
            </div>
            <div>
              <div className="text-sm text-steel-600">NYHA Class</div>
              <div className="font-semibold text-steel-900">{patient.nyhaClass}</div>
            </div>
            <div>
              <div className="text-sm text-steel-600">Risk Score</div>
              <div className="font-semibold text-red-600">{patient.riskScore}</div>
            </div>
          </div>
          
          {patient.deviceEligible && (
            <div className="mt-6">
              <div className="text-sm text-steel-600 mb-2">Device Eligibility</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  Device Eligible
                </span>
              </div>
            </div>
          )}
          
          {patient.phenotype && (
            <div className="mt-6">
              <div className="text-sm text-steel-600 mb-2">Phenotype</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  {patient.phenotype}
                </span>
              </div>
            </div>
          )}
          
          {patient.gdmtGaps.length > 0 && (
            <div className="mt-6">
              <div className="text-sm text-steel-600 mb-2">GDMT Gaps</div>
              <div className="flex flex-wrap gap-2">
                {patient.gdmtGaps.map(gap => (
                  <span key={gap} className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetailPanel;