import React from 'react';
import { demoAction } from '../../../../utils/demoActions';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface PopulationData {
  name: string;
  prevalenceEst: number;
  detected: number;
  detectionRate: number;
  actionable: number;
  avgCostPerPatient: number;
}

const EPPopulationOverview: React.FC = () => {
  const populations: PopulationData[] = [
 {
 name: 'Atrial Fibrillation',
 prevalenceEst: 320,
 detected: 265,
 detectionRate: 83,
 actionable: 185,
 avgCostPerPatient: 8500
 },
 {
 name: 'Atrial Flutter',
 prevalenceEst: 85,
 detected: 62,
 detectionRate: 73,
 actionable: 48,
 avgCostPerPatient: 12000
 },
 {
 name: 'Ventricular Tachycardia',
 prevalenceEst: 45,
 detected: 38,
 detectionRate: 84,
 actionable: 32,
 avgCostPerPatient: 25000
 },
 {
 name: 'Ventricular Fibrillation',
 prevalenceEst: 12,
 detected: 10,
 detectionRate: 83,
 actionable: 9,
 avgCostPerPatient: 45000
 },
 {
 name: 'SVT/AVNRT',
 prevalenceEst: 95,
 detected: 58,
 detectionRate: 61,
 actionable: 42,
 avgCostPerPatient: 15000
 },
 {
 name: 'WPW Syndrome',
 prevalenceEst: 28,
 detected: 22,
 detectionRate: 79,
 actionable: 18,
 avgCostPerPatient: 18000
 },
 {
 name: 'Bradycardia/SSS',
 prevalenceEst: 75,
 detected: 45,
 detectionRate: 60,
 actionable: 35,
 avgCostPerPatient: 22000
 },
 {
 name: 'AV Block',
 prevalenceEst: 38,
 detected: 32,
 detectionRate: 84,
 actionable: 28,
 avgCostPerPatient: 28000
 },
 {
 name: 'Long QT Syndrome',
 prevalenceEst: 22,
 detected: 8,
 detectionRate: 36,
 actionable: 6,
 avgCostPerPatient: 12000
 },
 {
 name: 'Brugada Syndrome',
 prevalenceEst: 15,
 detected: 5,
 detectionRate: 33,
 actionable: 4,
 avgCostPerPatient: 35000
 },
 {
 name: 'ARVC',
 prevalenceEst: 18,
 detected: 6,
 detectionRate: 33,
 actionable: 5,
 avgCostPerPatient: 30000
 },
 {
 name: 'CPVT',
 prevalenceEst: 8,
 detected: 2,
 detectionRate: 25,
 actionable: 2,
 avgCostPerPatient: 40000
 }
  ];

  const totalOpportunity = populations.reduce((sum, p) => 
 sum + (p.actionable * p.avgCostPerPatient), 0
  );

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900">EP Population Overview</h3>
 <p className="text-sm text-titanium-600 mt-1">12 Arrhythmia Populations in EP Service Line</p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600">Total Opportunity</div>
 <div className="text-2xl font-bold text-chrome-800">
 ${toFixed(totalOpportunity / 1000000, 1)}M
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {populations.map((population) => {
 const undetected = population.prevalenceEst - population.detected;
 const isHighGap = population.detectionRate < 70;

 return (
 <div 
 key={population.name}
 className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:scale-105 ${
 isHighGap 
 ? 'border-red-300 bg-red-50 hover:border-red-400' 
 : 'border-titanium-300 bg-titanium-50 hover:border-chrome-400'
 }`}
 onClick={demoAction()}
 >
 <div className="flex items-start justify-between mb-3">
 <div>
 <h4 className="font-semibold text-titanium-900">{population.name}</h4>
 <div className="text-xs text-titanium-600 mt-1">
 Est. Prevalence: {population.prevalenceEst} patients
 </div>
 </div>
 {isHighGap ? (
 <AlertCircle className="w-5 h-5 text-red-700" />
 ) : (
 <CheckCircle className="w-5 h-5 text-[#2C4A60]" />
 )}
 </div>

 <div className="grid grid-cols-3 gap-2 mb-3">
 <div>
 <div className="text-xs text-titanium-600">Detected</div>
 <div className="text-lg font-bold text-titanium-900">{population.detected}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600">Rate</div>
 <div className={`text-lg font-bold ${isHighGap ? 'text-red-800' : 'text-[#2C4A60]'}`}>
 {population.detectionRate}%
 </div>
 </div>
 <div>
 <div className="text-xs text-titanium-600">Actionable</div>
 <div className="text-lg font-bold text-chrome-800">{population.actionable}</div>
 </div>
 </div>

 <div className="relative w-full h-3 bg-titanium-200 rounded-full overflow-hidden mb-2">
 <div 
 className={`absolute left-0 top-0 h-full transition-all ${
 isHighGap ? 'bg-red-700' : 'bg-[#C8D4DC]'
 }`}
 style={{ width: `${population.detectionRate}%` }}
 />
 </div>

 <div className="flex items-center justify-between text-xs">
 <span className="text-titanium-700">
 {undetected} undetected ({Math.round((undetected / population.prevalenceEst) * 100)}% gap)
 </span>
 <span className="font-medium text-chrome-800">
 ${toFixed(population.actionable * population.avgCostPerPatient / 1000, 0)}K
 </span>
 </div>
 </div>
 );
 })}
 </div>

 <div className="mt-6 pt-4 border-t border-titanium-300">
 <div className="flex items-center gap-6 text-sm">
 <div className="flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-red-700" />
 <span className="text-titanium-700">High detection gap (&lt;70%)</span>
 </div>
 <div className="flex items-center gap-2">
 <CheckCircle className="w-4 h-4 text-[#2C4A60]" />
 <span className="text-titanium-700">Acceptable detection (≥70%)</span>
 </div>
 </div>
 </div>
 </div>
  );
};

export default EPPopulationOverview;