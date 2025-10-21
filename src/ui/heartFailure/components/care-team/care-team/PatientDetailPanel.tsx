import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, XCircle, Activity, Zap, Brain, Clock } from 'lucide-react';

interface PatientDetailPanelProps {
  patient: any;
  onClose: () => void;
}

type TabType = 'gdmt' | 'devices' | 'phenotypes' | 'timeline';

const PatientDetailPanel: React.FC<PatientDetailPanelProps> = ({ patient, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('gdmt');

  const gdmtStatus = {
    pillars: [
      { 
        name: 'ARNi/ACEi/ARB', 
        status: 'optimal', 
        medication: 'Sacubitril/valsartan', 
        dose: '97/103mg BID', 
        targetDose: '97/103mg BID',
        icon: CheckCircle 
      },
      { 
        name: 'Beta-Blocker', 
        status: 'suboptimal', 
        medication: 'Carvedilol', 
        dose: '12.5mg BID', 
        targetDose: '25mg BID',
        recommendation: 'Titrate to target dose',
        icon: AlertCircle 
      },
      { 
        name: 'SGLT2i', 
        status: 'optimal', 
        medication: 'Dapagliflozin', 
        dose: '10mg daily', 
        targetDose: '10mg daily',
        icon: CheckCircle 
      },
      { 
        name: 'MRA', 
        status: 'missing', 
        medication: null, 
        dose: null, 
        targetDose: 'Spironolactone 25-50mg daily',
        recommendation: 'Start spironolactone 25mg daily, check K+ and Cr',
        icon: XCircle 
      }
    ]
  };

  const pillarsOnTarget = gdmtStatus.pillars.filter(p => p.status === 'optimal').length;

  const getStatusColor = (status: string) => {
    if (status === 'optimal') return 'bg-emerald-50 border-emerald-300 text-emerald-900';
    if (status === 'suboptimal') return 'bg-amber-50 border-amber-300 text-amber-900';
    return 'bg-rose-50 border-rose-300 text-rose-900';
  };

  const tabs = [
    { id: 'gdmt', label: 'GDMT Status', icon: Activity },
    { id: 'devices', label: 'Device Eligibility', icon: Zap },
    { id: 'phenotypes', label: 'Phenotype Flags', icon: Brain },
    { id: 'timeline', label: 'Clinical Timeline', icon: Clock }
  ];

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-slate-50 z-50 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto">
        
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-300 p-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <span>MRN: {patient.mrn}</span>
                <span>•</span>
                <span>Age {patient.age}</span>
                <span>•</span>
                <span>{patient.assignedProvider}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4">
              <div className="text-xs font-medium text-rose-700 mb-1">Risk Score</div>
              <div className="text-3xl font-bold text-rose-900">{patient.riskScore}</div>
              <div className="text-xs text-rose-600 mt-1">30-day readmission probability</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
              <div className="text-xs font-medium text-blue-700 mb-1">Ejection Fraction</div>
              <div className="text-3xl font-bold text-blue-900">{patient.ef}%</div>
              <div className="text-xs text-blue-600 mt-1">Measured 2 weeks ago</div>
            </div>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <div className="text-xs font-medium text-amber-700 mb-1">NYHA Class</div>
              <div className="text-3xl font-bold text-amber-900">{patient.nyhaClass}</div>
              <div className="text-xs text-amber-600 mt-1">Functional status</div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-slate-300 px-6">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'gdmt' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-300 p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900">GDMT Optimization Progress</span>
                  <span className="text-2xl font-bold text-slate-900">{pillarsOnTarget}/4 Pillars</span>
                </div>
                <div className="flex gap-1 mb-2">
                  {gdmtStatus.pillars.map((pillar, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-3 rounded-full ${
                        pillar.status === 'optimal' ? 'bg-emerald-500' :
                        pillar.status === 'suboptimal' ? 'bg-amber-400' :
                        'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-slate-600">
                  {pillarsOnTarget === 4 ? 'Quadruple therapy achieved!' : 
                   `${4 - pillarsOnTarget} pillar${4 - pillarsOnTarget > 1 ? 's' : ''} need optimization`}
                </div>
              </div>

              <div className="space-y-4">
                {gdmtStatus.pillars.map((pillar, idx) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={idx}
                      className={`border-2 rounded-xl p-5 ${getStatusColor(pillar.status)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <div>
                            <div className="font-bold text-sm">{pillar.name}</div>
                            {pillar.medication && (
                              <div className="text-sm mt-1">
                                {pillar.medication} <span className="font-semibold">{pillar.dose}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          pillar.status === 'optimal' ? 'bg-emerald-100 text-emerald-900' :
                          pillar.status === 'suboptimal' ? 'bg-amber-100 text-amber-900' :
                          'bg-rose-100 text-rose-900'
                        }`}>
                          {pillar.status}
                        </span>
                      </div>

                      {pillar.status !== 'optimal' && (
                        <div className="mt-4 pt-4 border-t border-current/20">
                          <div className="flex items-start gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-semibold mb-1">Recommendation</div>
                              <div className="text-sm">{pillar.recommendation}</div>
                              <div className="text-xs mt-1 opacity-75">Target: {pillar.targetDose}</div>
                            </div>
                          </div>
                          <button className="w-full mt-3 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                            {pillar.status === 'suboptimal' ? 'Titrate Medication' : 'Start Medication'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="space-y-4">
              {patient.deviceEligible?.length > 0 ? (
                patient.deviceEligible.map((device: string) => (
                  <div key={device} className="bg-white border-2 border-indigo-300 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-slate-900">{device} Eligible</div>
                        <div className="text-sm text-slate-600 mt-1">
                          Based on: EF {patient.ef}%, NYHA {patient.nyhaClass}, QRS duration
                        </div>
                      </div>
                      <Zap className="w-6 h-6 text-indigo-600" />
                    </div>
                    <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                      Create EP Referral
                    </button>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-slate-300 rounded-xl p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <div className="font-semibold text-slate-900 mb-1">No Device Indications</div>
                  <div className="text-sm text-slate-600">Patient does not currently meet criteria for device therapy</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'phenotypes' && (
            <div className="space-y-4">
              {patient.phenotypeFlags?.length > 0 ? (
                patient.phenotypeFlags.map((phenotype: string) => (
                  <div key={phenotype} className="bg-white border-2 border-purple-300 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-slate-900">{phenotype}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          Confidence: High (82%)
                        </div>
                      </div>
                      <Brain className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-sm text-slate-700 mb-4">
                      Clinical criteria met: Age ≥65, LVH on echo, low ECG voltage, peripheral neuropathy
                    </div>
                    <button className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                      Order Workup (PYP Scan)
                    </button>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-slate-300 rounded-xl p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <div className="font-semibold text-slate-900 mb-1">No Phenotype Flags</div>
                  <div className="text-sm text-slate-600">No specialty HF phenotypes detected</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white border border-slate-300 rounded-xl p-6">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div className="w-0.5 h-full bg-slate-300 mt-2" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="text-xs text-slate-600 mb-1">Oct 1, 2025</div>
                    <div className="font-semibold text-slate-900">SGLT2i Started</div>
                    <div className="text-sm text-slate-600 mt-1">Dapagliflozin 10mg daily initiated</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-0.5 h-full bg-slate-300 mt-2" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="text-xs text-slate-600 mb-1">Sep 20, 2025</div>
                    <div className="font-semibold text-slate-900">Medication Gap Detected</div>
                    <div className="text-sm text-slate-600 mt-1">ARNi refill gap: 14 days</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div className="w-0.5 h-full bg-slate-300 mt-2" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="text-xs text-slate-600 mb-1">Sep 1, 2025</div>
                    <div className="font-semibold text-slate-900">Beta-Blocker Titrated</div>
                    <div className="text-sm text-slate-600 mt-1">Carvedilol increased: 6.25mg → 12.5mg BID</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-600 mb-1">Aug 15, 2025</div>
                    <div className="font-semibold text-slate-900">Hospital Admission</div>
                    <div className="text-sm text-slate-600 mt-1">CHF exacerbation, 4-day stay</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-300 p-6">
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
              Open Full Chart
            </button>
            <button className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
              Export Summary
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientDetailPanel;