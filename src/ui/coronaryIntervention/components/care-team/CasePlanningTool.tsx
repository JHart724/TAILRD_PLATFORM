import React, { useState } from 'react';

interface SyntaxScore {
  lesionCount: number;
  score: number;
  complexity: 'low' | 'intermediate' | 'high';
  recommendation: string;
}

interface ConduitSelection {
  lima: boolean; // Auto-selected for LAD
  rima: boolean;
  radialArtery: boolean;
  svg: boolean;
  configuration: string[];
}

interface HemodynamicsPlanning {
  accessSite: 'radial' | 'femoral';
  anticoagulation: {
    heparinDose: number;
    targetACT: number;
  };
  ffrPlanned: boolean;
  ifrPlanned: boolean;
  ivusPlanned: boolean;
  octPlanned: boolean;
}

interface MCSSupport {
  needed: boolean;
  device?: 'impella-cp' | 'impella-5.0' | 'iabp';
  indication?: string;
}

interface CasePlan {
  patientId: string;
  procedureType: 'PCI' | 'CABG';
  syntaxScore: SyntaxScore;
  conduits?: ConduitSelection;
  hemodynamics: HemodynamicsPlanning;
  mcsSupport: MCSSupport;
  complications: {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

const CasePlanningTool: React.FC = () => {
  const [casePlan, setCasePlan] = useState<CasePlan>({
    patientId: 'CI001234',
    procedureType: 'PCI',
    syntaxScore: {
      lesionCount: 3,
      score: 28,
      complexity: 'intermediate',
      recommendation: 'PCI or CABG acceptable'
    },
    hemodynamics: {
      accessSite: 'radial',
      anticoagulation: {
        heparinDose: 70,
        targetACT: 300
      },
      ffrPlanned: true,
      ifrPlanned: false,
      ivusPlanned: true,
      octPlanned: false
    },
    mcsSupport: {
      needed: false
    },
    complications: {
      riskLevel: 'medium',
      factors: ['Complex lesion anatomy', 'Moderate LV dysfunction']
    }
  });

  const [showCasePlan, setShowCasePlan] = useState(false);

  const getPatencyRates = (conduitType: string): { one: number; five: number; ten: number } => {
    switch (conduitType) {
      case 'LIMA':
        return { one: 98, five: 95, ten: 90 };
      case 'RIMA':
        return { one: 96, five: 92, ten: 85 };
      case 'Radial':
        return { one: 95, five: 89, ten: 80 };
      case 'SVG':
        return { one: 92, five: 75, ten: 50 };
      default:
        return { one: 0, five: 0, ten: 0 };
    }
  };

  const calculateHeparinDose = (weight: number = 80): number => {
    // Standard dosing: 70-100 units/kg
    return Math.round(weight * 70);
  };

  const getMCSDevice = (syntaxScore: number, ejectionFraction: number = 40): MCSSupport => {
    if (syntaxScore > 32 && ejectionFraction < 35) {
      return {
        needed: true,
        device: 'impella-cp',
        indication: 'High-risk PCI with reduced EF'
      };
    }
    if (syntaxScore > 40) {
      return {
        needed: true,
        device: 'iabp',
        indication: 'Very complex PCI'
      };
    }
    return { needed: false };
  };

  const updateConduits = (type: keyof ConduitSelection, value: boolean) => {
    if (!casePlan.conduits) return;
    
    setCasePlan(prev => ({
      ...prev,
      conduits: prev.conduits ? {
        ...prev.conduits,
        [type]: value
      } : undefined
    }));
  };

  const handleProcedureTypeChange = (type: 'PCI' | 'CABG') => {
    setCasePlan(prev => ({
      ...prev,
      procedureType: type,
      conduits: type === 'CABG' ? {
        lima: true, // Auto-selected for LAD
        rima: false,
        radialArtery: false,
        svg: false,
        configuration: ['LIMA to LAD']
      } : undefined,
      mcsSupport: type === 'PCI' ? getMCSDevice(prev.syntaxScore.score) : { needed: false }
    }));
  };

  const generateCasePlan = () => {
    const plan = `
CORONARY INTERVENTION CASE PLAN
===============================

Patient ID: ${casePlan.patientId}
Procedure Type: ${casePlan.procedureType}
Generated: ${new Date().toLocaleDateString()}

SYNTAX SCORE ASSESSMENT:
• Score: ${casePlan.syntaxScore.score} (${casePlan.syntaxScore.complexity.toUpperCase()})
• Lesion Count: ${casePlan.syntaxScore.lesionCount}
• Recommendation: ${casePlan.syntaxScore.recommendation}

${casePlan.procedureType === 'CABG' && casePlan.conduits ? `
CONDUIT SELECTION:
• LIMA to LAD: ${casePlan.conduits.lima ? 'Yes' : 'No'}
• RIMA: ${casePlan.conduits.rima ? 'Yes' : 'No'}
• Radial Artery: ${casePlan.conduits.radialArtery ? 'Yes' : 'No'}
• SVG: ${casePlan.conduits.svg ? 'Yes' : 'No'}

EXPECTED PATENCY RATES:
${casePlan.conduits.lima ? `• LIMA: 1yr: 98%, 5yr: 95%, 10yr: 90%` : ''}
${casePlan.conduits.rima ? `• RIMA: 1yr: 96%, 5yr: 92%, 10yr: 85%` : ''}
${casePlan.conduits.radialArtery ? `• Radial: 1yr: 95%, 5yr: 89%, 10yr: 80%` : ''}
${casePlan.conduits.svg ? `• SVG: 1yr: 92%, 5yr: 75%, 10yr: 50%` : ''}
` : ''}

HEMODYNAMICS PLANNING:
• Access Site: ${casePlan.hemodynamics.accessSite.toUpperCase()}
• Heparin Dose: ${casePlan.hemodynamics.anticoagulation.heparinDose} units/kg
• Target ACT: ${casePlan.hemodynamics.anticoagulation.targetACT} seconds
• FFR/iFR: ${casePlan.hemodynamics.ffrPlanned ? 'FFR planned' : casePlan.hemodynamics.ifrPlanned ? 'iFR planned' : 'Not planned'}
• IVUS: ${casePlan.hemodynamics.ivusPlanned ? 'Planned' : 'Not planned'}
• OCT: ${casePlan.hemodynamics.octPlanned ? 'Planned' : 'Not planned'}

${casePlan.mcsSupport.needed ? `
MECHANICAL CIRCULATORY SUPPORT:
• Device: ${casePlan.mcsSupport.device?.toUpperCase()}
• Indication: ${casePlan.mcsSupport.indication}
` : 'MECHANICAL CIRCULATORY SUPPORT: Not required'}

RISK ASSESSMENT:
• Risk Level: ${casePlan.complications.riskLevel.toUpperCase()}
• Risk Factors: ${casePlan.complications.factors.join(', ')}
    `;

    const blob = new Blob([plan], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-plan-${casePlan.patientId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSyntaxColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'intermediate':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-steel-900">Case Planning Tool</h2>
        <div className="flex items-center space-x-3">
          <select 
            value={casePlan.procedureType}
            onChange={(e) => handleProcedureTypeChange(e.target.value as 'PCI' | 'CABG')}
            className="px-3 py-2 border border-steel-300 rounded-lg text-sm"
          >
            <option value="PCI">PCI</option>
            <option value="CABG">CABG</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* SYNTAX Score */}
          <div>
            <h3 className="text-lg font-semibold text-steel-800 mb-3">SYNTAX Score Assessment</h3>
            <div className={`rounded-lg border p-4 ${getSyntaxColor(casePlan.syntaxScore.complexity)}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Score: {casePlan.syntaxScore.score}</span>
                <span className="px-2 py-1 text-xs rounded-full bg-white/50 font-medium">
                  {casePlan.syntaxScore.complexity.toUpperCase()}
                </span>
              </div>
              <div className="text-sm mb-2">
                Lesions: {casePlan.syntaxScore.lesionCount}
              </div>
              <div className="text-sm">
                {casePlan.syntaxScore.recommendation}
              </div>
            </div>
          </div>

          {/* Conduit Selection for CABG */}
          {casePlan.procedureType === 'CABG' && casePlan.conduits && (
            <div>
              <h3 className="text-lg font-semibold text-steel-800 mb-3">Conduit Selection</h3>
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-green-900">LIMA to LAD</span>
                      <div className="text-sm text-green-700">Gold standard graft</div>
                    </div>
                    <span className="text-green-600">✓ Auto-selected</span>
                  </div>
                </div>
                
                {[
                  { key: 'rima', label: 'RIMA', description: 'Right internal mammary' },
                  { key: 'radialArtery', label: 'Radial Artery', description: 'Arterial conduit' },
                  { key: 'svg', label: 'SVG', description: 'Saphenous vein graft' }
                ].map((conduit) => (
                  <div key={conduit.key} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                    <div>
                      <span className="font-medium text-steel-900">{conduit.label}</span>
                      <div className="text-sm text-steel-600">{conduit.description}</div>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={casePlan.conduits?.[conduit.key as keyof ConduitSelection] as boolean || false}
                        onChange={(e) => updateConduits(conduit.key as keyof ConduitSelection, e.target.checked)}
                        className="rounded border-steel-300"
                      />
                    </label>
                  </div>
                ))}
              </div>

              {/* Patency Rates */}
              <div className="mt-4">
                <h4 className="font-medium text-steel-800 mb-2">Expected Patency Rates</h4>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(casePlan.conduits).filter(([key, selected]) => selected && key !== 'configuration').map(([key]) => {
                    const conduitName = key === 'lima' ? 'LIMA' : key === 'rima' ? 'RIMA' : key === 'radialArtery' ? 'Radial' : 'SVG';
                    const rates = getPatencyRates(conduitName);
                    return (
                      <div key={key} className="bg-medical-blue-50 rounded p-2 text-sm">
                        <span className="font-medium">{conduitName}:</span>
                        <span className="ml-2">1yr: {rates.one}%, 5yr: {rates.five}%, 10yr: {rates.ten}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Hemodynamics Planning */}
          <div>
            <h3 className="text-lg font-semibold text-steel-800 mb-3">Hemodynamics Planning</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-2">Access Site</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accessSite"
                      value="radial"
                      checked={casePlan.hemodynamics.accessSite === 'radial'}
                      onChange={(e) => setCasePlan(prev => ({
                        ...prev,
                        hemodynamics: { ...prev.hemodynamics, accessSite: e.target.value as 'radial' | 'femoral' }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Radial</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accessSite"
                      value="femoral"
                      checked={casePlan.hemodynamics.accessSite === 'femoral'}
                      onChange={(e) => setCasePlan(prev => ({
                        ...prev,
                        hemodynamics: { ...prev.hemodynamics, accessSite: e.target.value as 'radial' | 'femoral' }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Femoral</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">Heparin Dose (units/kg)</label>
                  <input
                    type="number"
                    value={casePlan.hemodynamics.anticoagulation.heparinDose}
                    onChange={(e) => setCasePlan(prev => ({
                      ...prev,
                      hemodynamics: {
                        ...prev.hemodynamics,
                        anticoagulation: {
                          ...prev.hemodynamics.anticoagulation,
                          heparinDose: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">Target ACT (sec)</label>
                  <input
                    type="number"
                    value={casePlan.hemodynamics.anticoagulation.targetACT}
                    onChange={(e) => setCasePlan(prev => ({
                      ...prev,
                      hemodynamics: {
                        ...prev.hemodynamics,
                        anticoagulation: {
                          ...prev.hemodynamics.anticoagulation,
                          targetACT: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-steel-700 mb-2">Physiology & Imaging</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'ffrPlanned', label: 'FFR Planned' },
                    { key: 'ifrPlanned', label: 'iFR Planned' },
                    { key: 'ivusPlanned', label: 'IVUS Planned' },
                    { key: 'octPlanned', label: 'OCT Planned' }
                  ].map((option) => (
                    <label key={option.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={casePlan.hemodynamics[option.key as keyof HemodynamicsPlanning] as boolean}
                        onChange={(e) => setCasePlan(prev => ({
                          ...prev,
                          hemodynamics: {
                            ...prev.hemodynamics,
                            [option.key]: e.target.checked
                          }
                        }))}
                        className="mr-2 rounded border-steel-300"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* MCS Support for PCI */}
          {casePlan.procedureType === 'PCI' && (
            <div>
              <h3 className="text-lg font-semibold text-steel-800 mb-3">Mechanical Circulatory Support</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={casePlan.mcsSupport.needed}
                    onChange={(e) => setCasePlan(prev => ({
                      ...prev,
                      mcsSupport: { 
                        needed: e.target.checked,
                        device: e.target.checked ? 'impella-cp' : undefined,
                        indication: e.target.checked ? 'High-risk PCI' : undefined
                      }
                    }))}
                    className="mr-3 rounded border-steel-300"
                  />
                  <span className="font-medium">MCS Support Required</span>
                </label>

                {casePlan.mcsSupport.needed && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-orange-900 mb-2">Device Selection</label>
                        <select
                          value={casePlan.mcsSupport.device}
                          onChange={(e) => setCasePlan(prev => ({
                            ...prev,
                            mcsSupport: {
                              ...prev.mcsSupport,
                              device: e.target.value as 'impella-cp' | 'impella-5.0' | 'iabp'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-white"
                        >
                          <option value="impella-cp">Impella CP</option>
                          <option value="impella-5.0">Impella 5.0</option>
                          <option value="iabp">IABP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-orange-900 mb-1">Indication</label>
                        <input
                          type="text"
                          value={casePlan.mcsSupport.indication || ''}
                          onChange={(e) => setCasePlan(prev => ({
                            ...prev,
                            mcsSupport: {
                              ...prev.mcsSupport,
                              indication: e.target.value
                            }
                          }))}
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-white"
                          placeholder="Enter indication..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div>
            <h3 className="text-lg font-semibold text-steel-800 mb-3">Risk Assessment</h3>
            <div className={`rounded-lg border p-4 ${
              casePlan.complications.riskLevel === 'high' ? 'bg-red-50 border-red-200' :
              casePlan.complications.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Risk Level</label>
                <select
                  value={casePlan.complications.riskLevel}
                  onChange={(e) => setCasePlan(prev => ({
                    ...prev,
                    complications: {
                      ...prev.complications,
                      riskLevel: e.target.value as 'low' | 'medium' | 'high'
                    }
                  }))}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Risk Factors</label>
                <div className="space-y-2">
                  {casePlan.complications.factors.map((factor, index) => (
                    <div key={index} className="text-sm bg-white/50 rounded p-2">
                      • {factor}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Case Summary */}
          <div>
            <h3 className="text-lg font-semibold text-steel-800 mb-3">Case Summary</h3>
            <div className="bg-medical-blue-50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div><strong>Patient:</strong> {casePlan.patientId}</div>
                <div><strong>Procedure:</strong> {casePlan.procedureType}</div>
                <div><strong>SYNTAX:</strong> {casePlan.syntaxScore.score} ({casePlan.syntaxScore.complexity})</div>
                <div><strong>Access:</strong> {casePlan.hemodynamics.accessSite}</div>
                {casePlan.mcsSupport.needed && (
                  <div><strong>MCS:</strong> {casePlan.mcsSupport.device}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-steel-200">
        <div className="text-sm text-steel-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
        <div className="space-x-3">
          <button
            onClick={() => setShowCasePlan(true)}
            className="px-4 py-2 bg-medical-blue-100 text-medical-blue-700 rounded-lg hover:bg-medical-blue-200 transition-colors text-sm"
          >
            Review Plan
          </button>
          <button
            onClick={generateCasePlan}
            className="px-4 py-2 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors text-sm"
          >
            Generate Case Plan
          </button>
        </div>
      </div>

      {showCasePlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-steel-900">Case Plan Summary</h3>
              <button
                onClick={() => setShowCasePlan(false)}
                className="text-steel-500 hover:text-steel-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <strong>SYNTAX Score:</strong> {casePlan.syntaxScore.score} ({casePlan.syntaxScore.complexity})
              </div>
              <div>
                <strong>Procedure:</strong> {casePlan.procedureType}
              </div>
              {casePlan.conduits && (
                <div>
                  <strong>Conduits:</strong>
                  <ul className="mt-1 ml-4">
                    {casePlan.conduits.lima && <li>• LIMA to LAD</li>}
                    {casePlan.conduits.rima && <li>• RIMA</li>}
                    {casePlan.conduits.radialArtery && <li>• Radial Artery</li>}
                    {casePlan.conduits.svg && <li>• SVG</li>}
                  </ul>
                </div>
              )}
              <div>
                <strong>Access:</strong> {casePlan.hemodynamics.accessSite}
              </div>
              <div>
                <strong>Anticoagulation:</strong> {casePlan.hemodynamics.anticoagulation.heparinDose} units/kg, ACT {casePlan.hemodynamics.anticoagulation.targetACT}
              </div>
              {casePlan.mcsSupport.needed && (
                <div>
                  <strong>MCS Support:</strong> {casePlan.mcsSupport.device} - {casePlan.mcsSupport.indication}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasePlanningTool;