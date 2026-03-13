import React, { useState } from 'react';
import { Search, Eye, AlertTriangle, CheckCircle, X, Clock, TrendingUp } from 'lucide-react';

interface PhenotypeStatus {
  id: string;
  name: string;
  shortName: string;
  description: string;
  status: 'detected' | 'suspected' | 'ruled-out' | 'not-screened';
  prevalence: string;
  keyIndicators: string[];
  lastAssessed: Date;
  nextScreening?: Date;
  clinicalImpact: 'High' | 'Medium' | 'Low';
  module: 'Heart Failure' | 'Coronary' | 'Structural' | 'Arrhythmia' | 'Vascular';
}

interface PhenotypeScreeningPanelProps {
  patientId?: string;
  onPhenotypeSelect?: (phenotype: PhenotypeStatus) => void;
}

const PhenotypeScreeningPanel: React.FC<PhenotypeScreeningPanelProps> = ({
  patientId,
  onPhenotypeSelect
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhenotype, setSelectedPhenotype] = useState<PhenotypeStatus | null>(null);

  // Mock phenotype data - in real implementation, this would come from API
  const phenotypes: PhenotypeStatus[] = [
 {
 id: 'amyloidosis',
 name: 'Cardiac Amyloidosis',
 shortName: 'Amyloidosis',
 description: 'Infiltrative cardiomyopathy with protein deposition',
 status: 'suspected',
 prevalence: '13% in HFpEF patients',
 keyIndicators: ['Low-voltage ECG', 'Increased wall thickness', 'Strain pattern on echo'],
 lastAssessed: new Date('2024-10-15'),
 nextScreening: new Date('2024-12-15'),
 clinicalImpact: 'High',
 module: 'Heart Failure'
 },
 {
 id: 'hcm',
 name: 'Hypertrophic Cardiomyopathy',
 shortName: 'HCM',
 description: 'Genetic condition with asymmetric septal hypertrophy',
 status: 'not-screened',
 prevalence: '1 in 200 adults',
 keyIndicators: ['Unexplained LVH', 'SAM', 'Family history'],
 lastAssessed: new Date('2024-09-20'),
 clinicalImpact: 'High',
 module: 'Heart Failure'
 },
 {
 id: 'fabry',
 name: 'Fabry Disease',
 shortName: 'Fabry',
 description: 'X-linked lysosomal storage disorder',
 status: 'ruled-out',
 prevalence: '0.2% in HCM cohorts',
 keyIndicators: ['Concentric LVH', 'Renal dysfunction', 'Neuropathic pain'],
 lastAssessed: new Date('2024-10-10'),
 clinicalImpact: 'Medium',
 module: 'Heart Failure'
 },
 {
 id: 'fh',
 name: 'Familial Hypercholesterolemia',
 shortName: 'FH',
 description: 'Genetic disorder of cholesterol metabolism',
 status: 'detected',
 prevalence: '1 in 250 people',
 keyIndicators: ['LDL >190 mg/dL', 'Tendon xanthomas', 'Family history'],
 lastAssessed: new Date('2024-10-20'),
 clinicalImpact: 'High',
 module: 'Coronary'
 },
 {
 id: 'minoca',
 name: 'MINOCA',
 shortName: 'MINOCA',
 description: 'Myocardial infarction with non-obstructive coronaries',
 status: 'not-screened',
 prevalence: '6-8% of MI patients',
 keyIndicators: ['Troponin elevation', 'Clean coronaries', 'CMR abnormalities'],
 lastAssessed: new Date('2024-09-25'),
 clinicalImpact: 'Medium',
 module: 'Coronary'
 },
 {
 id: 'scad',
 name: 'Spontaneous Coronary Artery Dissection',
 shortName: 'SCAD',
 description: 'Non-traumatic separation of coronary arterial wall',
 status: 'not-screened',
 prevalence: '1-4% of ACS cases',
 keyIndicators: ['Young women', 'FMD', 'Pregnancy-related'],
 lastAssessed: new Date('2024-09-15'),
 clinicalImpact: 'High',
 module: 'Coronary'
 },
 {
 id: 'aortic-stenosis',
 name: 'Severe Aortic Stenosis',
 shortName: 'Severe AS',
 description: 'Advanced valvular aortic stenosis requiring intervention',
 status: 'detected',
 prevalence: '2-7% in >65 years',
 keyIndicators: ['AVA <1.0 cm²', 'Peak velocity >4 m/s', 'Symptoms'],
 lastAssessed: new Date('2024-10-22'),
 clinicalImpact: 'High',
 module: 'Structural'
 },
 {
 id: 'severe-mr',
 name: 'Severe Mitral Regurgitation',
 shortName: 'Severe MR',
 description: 'Advanced mitral valve regurgitation',
 status: 'suspected',
 prevalence: '0.2% general population',
 keyIndicators: ['ERO >40 mm²', 'RF >50%', 'LA enlargement'],
 lastAssessed: new Date('2024-10-18'),
 clinicalImpact: 'High',
 module: 'Structural'
 },
 {
 id: 'af-screening',
 name: 'Atrial Fibrillation Screening',
 shortName: 'AF Screen',
 description: 'Systematic screening for paroxysmal AF',
 status: 'not-screened',
 prevalence: '2.7-6.1% general population',
 keyIndicators: ['Age >65', 'Stroke risk factors', 'Palpitations'],
 lastAssessed: new Date('2024-09-30'),
 clinicalImpact: 'Medium',
 module: 'Arrhythmia'
 },
 {
 id: 'brugada',
 name: 'Brugada Syndrome',
 shortName: 'Brugada',
 description: 'Genetic arrhythmia syndrome',
 status: 'ruled-out',
 prevalence: '1 in 2000 people',
 keyIndicators: ['Type 1 pattern', 'Family history', 'Syncope'],
 lastAssessed: new Date('2024-10-05'),
 clinicalImpact: 'High',
 module: 'Arrhythmia'
 },
 {
 id: 'pad-screening',
 name: 'Peripheral Artery Disease',
 shortName: 'PAD',
 description: 'Lower extremity arterial disease screening',
 status: 'suspected',
 prevalence: '8.5% in adults >40',
 keyIndicators: ['ABI <0.9', 'Claudication', 'Risk factors'],
 lastAssessed: new Date('2024-10-12'),
 clinicalImpact: 'Medium',
 module: 'Vascular'
 },
 {
 id: 'carotid-stenosis',
 name: 'Carotid Artery Stenosis',
 shortName: 'Carotid Stenosis',
 description: 'Significant carotid artery narrowing',
 status: 'not-screened',
 prevalence: '7% in adults >70',
 keyIndicators: ['Carotid bruit', 'TIA/stroke', 'High-grade stenosis'],
 lastAssessed: new Date('2024-09-28'),
 clinicalImpact: 'High',
 module: 'Vascular'
 }
  ];

  const modules = ['All', 'Heart Failure', 'Coronary', 'Structural', 'Arrhythmia', 'Vascular'];

  const filteredPhenotypes = phenotypes.filter(phenotype => {
 const matchesModule = selectedModule === 'All' || phenotype.module === selectedModule;
 const matchesSearch = phenotype.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 phenotype.shortName.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesModule && matchesSearch;
  });

  const getStatusColor = (status: PhenotypeStatus['status']) => {
 switch (status) {
 case 'detected': return 'medical-red';
 case 'suspected': return 'medical-amber';
 case 'ruled-out': return 'medical-green';
 case 'not-screened': return 'titanium';
 default: return 'titanium';
 }
  };

  const getStatusIcon = (status: PhenotypeStatus['status']) => {
 switch (status) {
 case 'detected': return AlertTriangle;
 case 'suspected': return Eye;
 case 'ruled-out': return CheckCircle;
 case 'not-screened': return Clock;
 default: return Clock;
 }
  };

  const getStatusBadge = (status: PhenotypeStatus['status']) => {
 switch (status) {
 case 'detected': return 'DETECTED';
 case 'suspected': return 'SUSPECTED';
 case 'ruled-out': return 'RULED OUT';
 case 'not-screened': return 'NOT SCREENED';
 default: return 'UNKNOWN';
 }
  };

  const statusCounts = {
 detected: phenotypes.filter(p => p.status === 'detected').length,
 suspected: phenotypes.filter(p => p.status === 'suspected').length,
 'ruled-out': phenotypes.filter(p => p.status === 'ruled-out').length,
 'not-screened': phenotypes.filter(p => p.status === 'not-screened').length
  };

  return (
 <div className="retina-card p-6">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900 font-sf mb-2">
 Phenotype Screening Dashboard
 </h3>
 <p className="text-titanium-600">
 Systematic screening for cardiovascular phenotypes • {phenotypes.length} total pathways
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Screening Coverage</div>
 <div className="text-3xl font-bold text-titanium-900 font-sf">
 {Math.round(((statusCounts.detected + statusCounts.suspected + statusCounts['ruled-out']) / phenotypes.length) * 100)}%
 </div>
 <div className="text-sm text-titanium-600">
 {statusCounts.detected + statusCounts.suspected + statusCounts['ruled-out']} of {phenotypes.length} assessed
 </div>
 </div>
 </div>

 {/* Status Summary */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
 <div className="flex items-center gap-2 mb-2">
 <AlertTriangle className="w-5 h-5 text-red-600" />
 <span className="font-semibold text-red-800">Detected</span>
 </div>
 <div className="text-2xl font-bold text-red-700">{statusCounts.detected}</div>
 <div className="text-sm text-red-600">Require attention</div>
 </div>

 <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
 <div className="flex items-center gap-2 mb-2">
 <Eye className="w-5 h-5 text-amber-600" />
 <span className="font-semibold text-amber-800">Suspected</span>
 </div>
 <div className="text-2xl font-bold text-amber-700">{statusCounts.suspected}</div>
 <div className="text-sm text-amber-600">Need workup</div>
 </div>

 <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
 <div className="flex items-center gap-2 mb-2">
 <CheckCircle className="w-5 h-5 text-green-600" />
 <span className="font-semibold text-green-800">Ruled Out</span>
 </div>
 <div className="text-2xl font-bold text-green-700">{statusCounts['ruled-out']}</div>
 <div className="text-sm text-green-600">Excluded</div>
 </div>

 <div className="p-4 bg-gradient-to-br from-titanium-50 to-titanium-100 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-2 mb-2">
 <Clock className="w-5 h-5 text-titanium-600" />
 <span className="font-semibold text-titanium-800">Not Screened</span>
 </div>
 <div className="text-2xl font-bold text-titanium-700">{statusCounts['not-screened']}</div>
 <div className="text-sm text-titanium-600">Pending</div>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col md:flex-row gap-4 mb-6">
 <div className="flex-1">
 <div className="relative">
 <Search className="absolute left-3 top-3 h-4 w-4 text-titanium-400" />
 <input
 type="text"
 placeholder="Search phenotypes..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 />
 </div>
 </div>
 
 <div className="flex gap-2">
 {modules.map((module) => (
 <button
 key={module}
 onClick={() => setSelectedModule(module)}
 className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 ${
 selectedModule === module
 ? 'border-porsche-400 bg-porsche-50 text-porsche-700'
 : 'border-titanium-200 hover:border-titanium-300 text-titanium-600'
 }`}
 >
 {module}
 </button>
 ))}
 </div>
 </div>

 {/* Phenotype Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
 {filteredPhenotypes.map((phenotype) => {
 const StatusIcon = getStatusIcon(phenotype.status);
 const statusColor = getStatusColor(phenotype.status);

 return (
 <button
 key={phenotype.id}
 onClick={() => {
 setSelectedPhenotype(phenotype);
 onPhenotypeSelect?.(phenotype);
 }}
 className="p-4 bg-white rounded-xl border-2 border-titanium-200 hover:border-titanium-300 hover:shadow-chrome-card-hover transition-all text-left"
 >
 {/* Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-2">
 <div className={`w-8 h-8 rounded-lg bg-${statusColor}-100 flex items-center justify-center`}>
 <StatusIcon className={`w-4 h-4 text-${statusColor}-600`} />
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{phenotype.shortName}</div>
 <div className="text-xs text-titanium-600">{phenotype.module}</div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-700`}>
 {getStatusBadge(phenotype.status)}
 </div>
 </div>

 {/* Description */}
 <p className="text-sm text-titanium-700 mb-3">{phenotype.description}</p>

 {/* Prevalence */}
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Prevalence</div>
 <div className="text-sm font-medium text-titanium-900">{phenotype.prevalence}</div>
 </div>

 {/* Key Indicators */}
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Key Indicators</div>
 <div className="flex flex-wrap gap-1">
 {phenotype.keyIndicators.slice(0, 2).map((indicator, idx) => (
 <span
 key={idx}
 className="px-2 py-0.5 bg-titanium-100 text-titanium-700 text-xs rounded"
 >
 {indicator}
 </span>
 ))}
 {phenotype.keyIndicators.length > 2 && (
 <span className="px-2 py-0.5 bg-titanium-100 text-titanium-700 text-xs rounded">
 +{phenotype.keyIndicators.length - 2} more
 </span>
 )}
 </div>
 </div>

 {/* Last Assessed */}
 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs text-titanium-600">Last Assessed</div>
 <div className="text-sm text-titanium-900">
 {phenotype.lastAssessed.toLocaleDateString()}
 </div>
 </div>
 <div className={`w-3 h-3 rounded-full ${
 phenotype.clinicalImpact === 'High' ? 'bg-red-500' :
 phenotype.clinicalImpact === 'Medium' ? 'bg-amber-500' :
 'bg-green-500'
 }`} title={`${phenotype.clinicalImpact} clinical impact`}></div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Summary Actions */}
 <div className="flex justify-center">
 <div className="flex gap-3">
 <button 
 onClick={() => {
 console.log('Generating phenotype screening report');
 {}
 }}
 className="bg-porsche-500 text-white py-3 px-6 rounded-lg hover:bg-porsche-600 transition-colors font-medium"
 >
 Generate Screening Report
 </button>
 <button 
 onClick={() => {
 console.log('Scheduling phenotype assessments');
 {}
 }}
 className="bg-white border border-titanium-300 text-titanium-700 py-3 px-6 rounded-lg hover:bg-titanium-50 transition-colors font-medium"
 >
 Schedule Assessments
 </button>
 <button 
 onClick={() => {
 console.log('Viewing screening analytics');
 {}
 }}
 className="bg-white border border-titanium-300 text-titanium-700 py-3 px-6 rounded-lg hover:bg-titanium-50 transition-colors font-medium flex items-center gap-2"
 >
 <TrendingUp className="w-4 h-4" />
 View Analytics
 </button>
 </div>
 </div>

 {/* Filtered Results Info */}
 {searchQuery && (
 <div className="mt-4 text-center text-sm text-titanium-600">
 Showing {filteredPhenotypes.length} of {phenotypes.length} phenotypes
 {selectedModule !== 'All' && ` in ${selectedModule}`}
 </div>
 )}
 </div>
  );
};

export default PhenotypeScreeningPanel;