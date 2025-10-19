import React, { useState } from 'react';
import { Send, CheckCircle, Clock, XCircle, AlertTriangle, User, Calendar, MapPin, MessageCircle } from 'lucide-react';

interface Referral {
  id: string;
  patientName: string;
  mrn: string;
  age: number;
  referralType: string;
  targetSpecialty: string;
  targetProvider?: string;
  indication: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  sentDate: string;
  scheduledDate?: string;
  completedDate?: string;
  sentBy: string;
  priority: 'urgent' | 'routine';
  notes?: string;
  expectedOutcome: string;
  estimatedCost?: number;
  insuranceStatus: 'approved' | 'pending' | 'denied' | 'not_required';
  followUpRequired: boolean;
  clinicalContext: {
    lvef?: number;
    nyhaClass?: string;
    primaryDiagnosis: string;
    comorbidities: string[];
  };
}

const ReferralTrackerEnhanced: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  const referrals: Referral[] = [
    {
      id: 'REF001',
      patientName: 'Johnson, Maria',
      mrn: '123456789',
      age: 67,
      referralType: 'CRT-D Evaluation',
      targetSpecialty: 'Electrophysiology',
      targetProvider: 'Dr. Anderson',
      indication: 'EF 28%, NYHA III, QRS 152ms, LBBB, optimal GDMT',
      status: 'scheduled',
      sentDate: '2025-10-05',
      scheduledDate: '2025-10-25',
      sentBy: 'Dr. Rivera',
      priority: 'urgent',
      expectedOutcome: 'CRT-D implantation if anatomically feasible',
      estimatedCost: 85000,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 28,
        nyhaClass: 'III',
        primaryDiagnosis: 'Ischemic cardiomyopathy',
        comorbidities: ['Diabetes mellitus', 'Chronic kidney disease stage 3'],
      },
    },
    {
      id: 'REF002',
      patientName: 'Williams, Robert',
      mrn: '987654321',
      age: 72,
      referralType: 'Cardiac Amyloidosis Workup',
      targetSpecialty: 'Advanced Heart Failure',
      targetProvider: 'Dr. Martinez',
      indication: 'Amyloid risk flags: age >65, unexplained LVH, neuropathy, low voltage ECG',
      status: 'pending',
      sentDate: '2025-10-08',
      sentBy: 'Dr. Chen',
      priority: 'routine',
      expectedOutcome: 'Rule out cardiac amyloidosis, optimize therapy',
      estimatedCost: 12000,
      insuranceStatus: 'pending',
      followUpRequired: true,
      clinicalContext: {
        lvef: 45,
        nyhaClass: 'II',
        primaryDiagnosis: 'Heart failure with preserved ejection fraction',
        comorbidities: ['Peripheral neuropathy', 'Bilateral carpal tunnel syndrome'],
      },
    },
    {
      id: 'REF003',
      patientName: 'Davis, Linda',
      mrn: '456789123',
      age: 58,
      referralType: 'LVAD Evaluation',
      targetSpecialty: 'Cardiac Surgery',
      targetProvider: 'Dr. Thompson',
      indication: 'EF 22%, NYHA IV, inotrope-dependent, transplant candidate',
      status: 'overdue',
      sentDate: '2025-09-28',
      sentBy: 'Dr. Martinez',
      priority: 'urgent',
      notes: 'Patient initially declined evaluation, family now supportive',
      expectedOutcome: 'Bridge to transplant vs destination therapy LVAD',
      estimatedCost: 150000,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 22,
        nyhaClass: 'IV',
        primaryDiagnosis: 'Non-ischemic cardiomyopathy',
        comorbidities: ['Pulmonary hypertension', 'Chronic kidney disease stage 4'],
      },
    },
    {
      id: 'REF004',
      patientName: 'Brown, Charles',
      mrn: '789123456',
      age: 45,
      referralType: 'Genetic Testing & Counseling',
      targetSpecialty: 'Medical Genetics',
      targetProvider: 'Dr. Wilson',
      indication: 'HCM phenotype, strong family history, age <50',
      status: 'completed',
      sentDate: '2025-09-15',
      scheduledDate: '2025-09-25',
      completedDate: '2025-10-02',
      sentBy: 'Dr. Foster',
      priority: 'routine',
      expectedOutcome: 'Genetic counseling and cascade screening',
      estimatedCost: 3500,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 60,
        nyhaClass: 'I',
        primaryDiagnosis: 'Hypertrophic cardiomyopathy',
        comorbidities: ['Family history of sudden cardiac death'],
      },
    },
    {
      id: 'REF005',
      patientName: 'Anderson, Sarah',
      mrn: '321654987',
      age: 81,
      referralType: 'CardioMEMS Evaluation',
      targetSpecialty: 'Interventional Cardiology',
      targetProvider: 'Dr. Park',
      indication: 'Recurrent HF hospitalizations, NYHA III despite optimal therapy',
      status: 'scheduled',
      sentDate: '2025-10-12',
      scheduledDate: '2025-10-28',
      sentBy: 'Dr. Park',
      priority: 'routine',
      expectedOutcome: 'Remote hemodynamic monitoring to reduce hospitalizations',
      estimatedCost: 25000,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 31,
        nyhaClass: 'III',
        primaryDiagnosis: 'Heart failure with reduced ejection fraction',
        comorbidities: ['Atrial fibrillation', 'Chronic kidney disease stage 3'],
      },
    },
  ];

  const filteredReferrals = referrals.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="w-5 h-5 text-medical-amber-600" />,
      scheduled: <Calendar className="w-5 h-5 text-medical-blue-600" />,
      completed: <CheckCircle className="w-5 h-5 text-medical-green-600" />,
      cancelled: <XCircle className="w-5 h-5 text-steel-500" />,
      overdue: <AlertTriangle className="w-5 h-5 text-medical-red-600" />
    };
    return icons[status as keyof typeof icons];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-medical-amber-50 text-medical-amber-800 border-medical-amber-200',
      scheduled: 'bg-medical-blue-50 text-medical-blue-800 border-medical-blue-200',
      completed: 'bg-medical-green-50 text-medical-green-800 border-medical-green-200',
      cancelled: 'bg-steel-100 text-steel-700 border-steel-300',
      overdue: 'bg-medical-red-50 text-medical-red-800 border-medical-red-200'
    };
    return colors[status as keyof typeof colors];
  };

  const getInsuranceColor = (status: string) => {
    const colors = {
      approved: 'text-medical-green-600 bg-medical-green-100',
      pending: 'text-medical-amber-600 bg-medical-amber-100',
      denied: 'text-medical-red-600 bg-medical-red-100',
      not_required: 'text-steel-600 bg-steel-100',
    };
    return colors[status as keyof typeof colors];
  };

  const statusCounts = {
    all: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    scheduled: referrals.filter(r => r.status === 'scheduled').length,
    overdue: referrals.filter(r => r.status === 'overdue').length,
    completed: referrals.filter(r => r.status === 'completed').length
  };

  const urgentCount = referrals.filter(r => r.priority === 'urgent' && r.status !== 'completed').length;
  const totalCost = filteredReferrals.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

  return (
    <div className="retina-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Referral Management Center
          </h2>
          <p className="text-steel-600">
            Track specialist referrals and coordinate care transitions
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Urgent Referrals</div>
          <div className="text-3xl font-bold text-medical-red-600 font-sf">
            {urgentCount}
          </div>
          <div className="text-sm text-steel-600">Need immediate attention</div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { key: 'all', label: 'Total', count: statusCounts.all, color: 'steel' },
          { key: 'pending', label: 'Pending', count: statusCounts.pending, color: 'medical-amber' },
          { key: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled, color: 'medical-blue' },
          { key: 'overdue', label: 'Overdue', count: statusCounts.overdue, color: 'medical-red' },
          { key: 'completed', label: 'Completed', count: statusCounts.completed, color: 'medical-green' }
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
              filterStatus === key
                ? `border-${color}-400 bg-${color}-50 shadow-retina-3`
                : 'border-steel-200 bg-white hover:border-steel-300 hover:shadow-retina-2'
            }`}
          >
            <div className={`text-3xl font-bold mb-1 font-sf ${
              filterStatus === key ? `text-${color}-600` : 'text-steel-900'
            }`}>
              {count}
            </div>
            <div className={`text-sm font-medium ${
              filterStatus === key ? `text-${color}-700` : 'text-steel-600'
            }`}>
              {label}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6 p-4 bg-steel-50 rounded-xl border border-steel-200">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-steel-700">Filters:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-steel-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent Only</option>
            <option value="routine">Routine Only</option>
          </select>
        </div>
        <div className="flex items-center gap-4 text-sm text-steel-600">
          <div>Total Estimated Cost: <span className="font-bold text-steel-900">${totalCost.toLocaleString()}</span></div>
          <div>Showing {filteredReferrals.length} of {referrals.length} referrals</div>
        </div>
      </div>

      {/* Referral Cards */}
      <div className="space-y-4">
        {filteredReferrals.map((referral) => (
          <div
            key={referral.id}
            className={`retina-card border-l-4 transition-all duration-300 hover:shadow-retina-3 cursor-pointer ${
              referral.status === 'overdue' ? 'border-l-medical-red-400' :
              referral.status === 'urgent' ? 'border-l-medical-amber-400' :
              'border-l-medical-blue-400'
            }`}
            onClick={() => setSelectedReferral(selectedReferral?.id === referral.id ? null : referral)}
          >
            <div className="p-5">
              {/* Referral Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-medical-blue-100">
                    {getStatusIcon(referral.status)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-steel-900">{referral.patientName}</h3>
                      <span className="text-sm text-steel-600">Age {referral.age}</span>
                      <span className="text-sm text-steel-600">MRN: {referral.mrn}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-steel-700">{referral.referralType}</span>
                      <span className="text-sm text-steel-500">→</span>
                      <span className="text-sm text-steel-700">{referral.targetSpecialty}</span>
                      {referral.targetProvider && (
                        <>
                          <span className="text-sm text-steel-500">•</span>
                          <span className="text-sm text-steel-700">{referral.targetProvider}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {referral.priority === 'urgent' && (
                    <span className="px-3 py-1 bg-medical-red-100 text-medical-red-800 text-sm font-semibold rounded-lg">
                      URGENT
                    </span>
                  )}
                  <span className={`px-3 py-1 text-sm font-semibold rounded-lg border ${getStatusColor(referral.status)}`}>
                    {referral.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-steel-50 rounded-xl">
                <div>
                  <div className="text-xs text-steel-600 mb-1">Clinical Indication</div>
                  <div className="text-sm text-steel-800 font-medium">{referral.indication}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Expected Outcome</div>
                  <div className="text-sm text-steel-800">{referral.expectedOutcome}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Estimated Cost</div>
                  <div className="text-sm font-bold text-steel-900">
                    {referral.estimatedCost ? `$${referral.estimatedCost.toLocaleString()}` : 'TBD'}
                  </div>
                </div>
              </div>

              {/* Timeline and Status */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-sm text-steel-600 mb-1">Sent Date</div>
                  <div className="font-medium text-steel-900">
                    {new Date(referral.sentDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-steel-500">by {referral.sentBy}</div>
                </div>
                {referral.scheduledDate && (
                  <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                    <div className="text-sm text-steel-600 mb-1">Scheduled</div>
                    <div className="font-medium text-medical-blue-700">
                      {new Date(referral.scheduledDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {referral.completedDate && (
                  <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                    <div className="text-sm text-steel-600 mb-1">Completed</div>
                    <div className="font-medium text-medical-green-700">
                      {new Date(referral.completedDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-sm text-steel-600 mb-1">Insurance</div>
                  <div className={`text-sm font-semibold px-2 py-1 rounded ${getInsuranceColor(referral.insuranceStatus)}`}>
                    {referral.insuranceStatus.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedReferral?.id === referral.id && (
                <div className="mt-4 p-4 bg-medical-blue-50/50 rounded-xl border border-medical-blue-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Clinical Context</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-steel-600">Primary Diagnosis:</span>
                          <span className="text-sm font-medium text-steel-800">
                            {referral.clinicalContext.primaryDiagnosis}
                          </span>
                        </div>
                        {referral.clinicalContext.lvef && (
                          <div className="flex justify-between">
                            <span className="text-sm text-steel-600">LVEF:</span>
                            <span className="text-sm font-medium text-steel-800">
                              {referral.clinicalContext.lvef}%
                            </span>
                          </div>
                        )}
                        {referral.clinicalContext.nyhaClass && (
                          <div className="flex justify-between">
                            <span className="text-sm text-steel-600">NYHA Class:</span>
                            <span className="text-sm font-medium text-steel-800">
                              {referral.clinicalContext.nyhaClass}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-steel-600 mb-1">Comorbidities:</div>
                          <div className="space-y-1">
                            {referral.clinicalContext.comorbidities.map((condition, index) => (
                              <div key={index} className="text-sm text-steel-800 bg-white px-2 py-1 rounded border">
                                {condition}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Next Steps</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-medical-green-600" />
                          <span className="text-sm text-steel-800">Follow-up required: {referral.followUpRequired ? 'Yes' : 'No'}</span>
                        </div>
                        {referral.notes && (
                          <div className="mt-3">
                            <div className="text-sm text-steel-600 mb-1">Notes:</div>
                            <div className="text-sm text-steel-800 bg-medical-amber-50 p-3 rounded border border-medical-amber-200">
                              {referral.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-steel-200">
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-medical-blue-600 text-white text-sm rounded-lg hover:bg-medical-blue-700 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Follow Up
                  </button>
                  {referral.status === 'pending' && (
                    <button className="px-4 py-2 bg-medical-green-100 text-medical-green-800 text-sm rounded-lg hover:bg-medical-green-200 transition-colors border border-medical-green-300">
                      Mark Scheduled
                    </button>
                  )}
                  {referral.status === 'scheduled' && (
                    <button className="px-4 py-2 bg-medical-amber-100 text-medical-amber-800 text-sm rounded-lg hover:bg-medical-amber-200 transition-colors border border-medical-amber-300">
                      Send Reminder
                    </button>
                  )}
                </div>
                <div className="text-sm text-steel-600">
                  {referral.followUpRequired && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-medical-amber-600" />
                      Follow-up required
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferralTrackerEnhanced;