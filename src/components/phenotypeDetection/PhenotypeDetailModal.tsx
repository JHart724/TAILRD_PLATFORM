import React from 'react';
import { X, AlertTriangle, CheckCircle, Clock, Eye, BookOpen, Users, TrendingUp, Calendar } from 'lucide-react';

interface DiagnosticCriterion {
  category: string;
  criteria: {
 name: string;
 present: boolean | null;
 weight: 'major' | 'minor' | 'supportive';
 description: string;
 value?: string;
  }[];
}

interface Evidence {
  type: 'for' | 'against';
  category: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
  source: string;
  date?: Date;
}

interface NextStep {
  priority: 'urgent' | 'routine' | 'follow-up';
  action: string;
  description: string;
  timeframe: string;
  responsible: string;
}

interface PhenotypeDetail {
  id: string;
  name: string;
  shortName: string;
  description: string;
  status: 'detected' | 'suspected' | 'ruled-out' | 'not-screened';
  prevalence: string;
  clinicalImpact: 'High' | 'Medium' | 'Low';
  module: string;
  lastAssessed: Date;
  diagnosticCriteria: DiagnosticCriterion[];
  currentEvidence: Evidence[];
  nextSteps: NextStep[];
  guidelines: {
 organization: string;
 recommendation: string;
 year: number;
  }[];
  relatedPhenotypes: string[];
  treatmentImplications: string[];
}

interface PhenotypeDetailModalProps {
  phenotype: PhenotypeDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (phenotypeId: string, newStatus: PhenotypeDetail['status']) => void;
}

const PhenotypeDetailModal: React.FC<PhenotypeDetailModalProps> = ({
  phenotype,
  isOpen,
  onClose,
  onStatusUpdate
}) => {
  if (!isOpen || !phenotype) return null;

  const getStatusColor = (status: PhenotypeDetail['status']) => {
 switch (status) {
 case 'detected': return 'medical-red';
 case 'suspected': return 'medical-amber';
 case 'ruled-out': return 'medical-green';
 case 'not-screened': return 'titanium';
 default: return 'titanium';
 }
  };

  const getStatusIcon = (status: PhenotypeDetail['status']) => {
 switch (status) {
 case 'detected': return AlertTriangle;
 case 'suspected': return Eye;
 case 'ruled-out': return CheckCircle;
 case 'not-screened': return Clock;
 default: return Clock;
 }
  };

  const getEvidenceIcon = (type: Evidence['type']) => {
 return type === 'for' ? CheckCircle : X;
  };

  const getEvidenceColor = (type: Evidence['type']) => {
 return type === 'for' ? 'medical-green' : 'medical-red';
  };

  const getPriorityColor = (priority: NextStep['priority']) => {
 switch (priority) {
 case 'urgent': return 'medical-red';
 case 'routine': return 'porsche';
 case 'follow-up': return 'medical-green';
 default: return 'titanium';
 }
  };

  const StatusIcon = getStatusIcon(phenotype.status);
  const statusColor = getStatusColor(phenotype.status);

  // Mock detailed data - this would come from the phenotype files
  const mockPhenotype: PhenotypeDetail = {
 ...phenotype,
 diagnosticCriteria: [
 {
 category: 'Clinical Features',
 criteria: [
 {
 name: 'Heart failure with preserved EF',
 present: true,
 weight: 'major',
 description: 'HFpEF with unexplained cause',
 value: 'EF 55%'
 },
 {
 name: 'Increased wall thickness',
 present: true,
 weight: 'major',
 description: 'LV wall thickness >12mm without hypertension',
 value: '15mm'
 },
 {
 name: 'Low-voltage ECG',
 present: true,
 weight: 'minor',
 description: 'QRS voltage <0.5mV in limb leads',
 value: '0.4mV'
 }
 ]
 },
 {
 category: 'Imaging',
 criteria: [
 {
 name: 'Strain pattern',
 present: null,
 weight: 'major',
 description: 'Apical sparing pattern on strain imaging',
 value: 'Pending'
 },
 {
 name: 'Tc99m-PYP uptake',
 present: null,
 weight: 'major',
 description: 'Grade 2-3 cardiac uptake on bone scan',
 value: 'Not performed'
 }
 ]
 },
 {
 category: 'Laboratory',
 criteria: [
 {
 name: 'Elevated troponin',
 present: true,
 weight: 'supportive',
 description: 'Chronic troponin elevation',
 value: '0.08 ng/mL'
 },
 {
 name: 'Elevated BNP',
 present: true,
 weight: 'supportive',
 description: 'Disproportionately elevated natriuretic peptides',
 value: 'BNP 450 pg/mL'
 }
 ]
 }
 ],
 currentEvidence: [
 {
 type: 'for',
 category: 'Clinical',
 description: 'HFpEF with unexplained LV hypertrophy',
 strength: 'strong',
 source: 'Echo 10/20/24'
 },
 {
 type: 'for',
 category: 'ECG',
 description: 'Low voltage despite increased wall thickness',
 strength: 'moderate',
 source: 'ECG 10/15/24'
 },
 {
 type: 'against',
 category: 'History',
 description: 'No family history of amyloidosis',
 strength: 'weak',
 source: 'History 10/10/24'
 }
 ],
 nextSteps: [
 {
 priority: 'urgent',
 action: 'Tc99m-PYP scan',
 description: 'Bone scan to assess for ATTR cardiac uptake',
 timeframe: 'Within 2 weeks',
 responsible: 'Nuclear Medicine'
 },
 {
 priority: 'routine',
 action: 'Strain echocardiography',
 description: 'Assess for apical sparing pattern',
 timeframe: 'Within 1 month',
 responsible: 'Cardiology'
 },
 {
 priority: 'follow-up',
 action: 'Genetics consultation',
 description: 'If ATTR suspected, genetic counseling',
 timeframe: 'If scan positive',
 responsible: 'Genetics'
 }
 ],
 guidelines: [
 {
 organization: 'Heart Failure Society of America',
 recommendation: 'Screen HFpEF patients with unexplained LVH for cardiac amyloidosis',
 year: 2022
 },
 {
 organization: 'European Society of Cardiology',
 recommendation: 'Consider amyloidosis in patients with HF and red flag features',
 year: 2021
 }
 ],
 relatedPhenotypes: ['Hypertrophic Cardiomyopathy', 'Fabry Disease', 'Light Chain Amyloidosis'],
 treatmentImplications: [
 'Avoid ACE inhibitors if severe stenosis',
 'Consider TTR stabilizers if ATTR confirmed',
 'Diuretics for symptom management',
 'Genetic counseling for family members'
 ]
  };

  return (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-10 pb-10">
 <div className="bg-white rounded-xl max-w-4xl w-full max-h-full overflow-y-auto mx-4 shadow-2xl">
 {/* Header */}
 <div className={`sticky top-0 bg-gradient-to-r from-${statusColor}-50 to-${statusColor}-100 border-b border-${statusColor}-200 p-6 z-10`}>
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 rounded-xl bg-${statusColor}-200 flex items-center justify-center`}>
 <StatusIcon className={`w-6 h-6 text-${statusColor}-600`} />
 </div>
 <div>
 <h2 className="text-2xl font-bold text-titanium-900">{mockPhenotype.name}</h2>
 <p className="text-titanium-600 mt-1">{mockPhenotype.description}</p>
 <div className="flex items-center gap-4 mt-2">
 <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${statusColor}-200 text-${statusColor}-800`}>
 {phenotype.status.toUpperCase().replace('-', ' ')}
 </span>
 <span className="text-sm text-titanium-600">{mockPhenotype.module}</span>
 <span className="text-sm text-titanium-600">Impact: {mockPhenotype.clinicalImpact}</span>
 </div>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-lg hover:bg-titanium-100 transition-colors"
 >
 <X className="w-5 h-5 text-titanium-600" />
 </button>
 </div>
 </div>

 <div className="p-6">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column - Diagnostic Criteria */}
 <div className="lg:col-span-2">
 <h3 className="text-xl font-bold text-titanium-900 mb-4 flex items-center gap-2">
 <BookOpen className="w-5 h-5" />
 Diagnostic Criteria
 </h3>

 <div className="space-y-6">
 {mockPhenotype.diagnosticCriteria.map((category, categoryIndex) => (
 <div key={category.category} className="bg-white border border-titanium-200 rounded-xl p-4">
 <h4 className="font-semibold text-titanium-900 mb-3">{category.category}</h4>
 <div className="space-y-3">
 {category.criteria.map((criterion, criterionIndex) => (
 <div key={criterion.name} className="flex items-start justify-between p-3 bg-titanium-50 rounded-lg">
 <div className="flex items-start gap-3 flex-1">
 <div className="mt-1">
 {criterion.present === true && (
 <CheckCircle className="w-4 h-4 text-green-600" />
 )}
 {criterion.present === false && (
 <X className="w-4 h-4 text-red-600" />
 )}
 {criterion.present === null && (
 <Clock className="w-4 h-4 text-titanium-400" />
 )}
 </div>
 <div className="flex-1">
 <div className="font-medium text-titanium-900">{criterion.name}</div>
 <div className="text-sm text-titanium-600 mt-1">{criterion.description}</div>
 {criterion.value && (
 <div className="text-sm font-medium text-titanium-700 mt-1">
 Value: {criterion.value}
 </div>
 )}
 </div>
 </div>
 <div className={`px-2 py-1 rounded text-xs font-medium ${
 criterion.weight === 'major' ? 'bg-red-100 text-red-700' :
 criterion.weight === 'minor' ? 'bg-amber-100 text-amber-700' :
 'bg-chrome-100 text-chrome-700'
 }`}>
 {criterion.weight}
 </div>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>

 {/* Current Evidence */}
 <div className="mt-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-4 flex items-center gap-2">
 <TrendingUp className="w-5 h-5" />
 Current Evidence
 </h3>

 <div className="space-y-3">
 {mockPhenotype.currentEvidence.map((evidence, index) => {
 const EvidenceIcon = getEvidenceIcon(evidence.type);
 const evidenceColor = getEvidenceColor(evidence.type);

 return (
 <div key={`${evidence.category}-${evidence.type}`} className="flex items-start gap-3 p-3 bg-white border border-titanium-200 rounded-lg">
 <EvidenceIcon className={`w-4 h-4 text-${evidenceColor}-600 mt-0.5`} />
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-medium text-titanium-900">{evidence.category}</span>
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
 evidence.strength === 'strong' ? 'bg-green-100 text-green-700' :
 evidence.strength === 'moderate' ? 'bg-amber-100 text-amber-700' :
 'bg-titanium-100 text-titanium-700'
 }`}>
 {evidence.strength}
 </span>
 </div>
 <p className="text-sm text-titanium-700">{evidence.description}</p>
 <div className="text-xs text-titanium-500 mt-1">{evidence.source}</div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Right Column - Next Steps & Info */}
 <div>
 {/* Next Steps */}
 <div className="mb-6">
 <h3 className="text-lg font-bold text-titanium-900 mb-4 flex items-center gap-2">
 <Calendar className="w-5 h-5" />
 Next Steps
 </h3>

 <div className="space-y-3">
 {mockPhenotype.nextSteps.map((step, index) => {
 const priorityColor = getPriorityColor(step.priority);

 return (
 <div key={step.action} className="p-3 bg-white border border-titanium-200 rounded-lg">
 <div className="flex items-center gap-2 mb-2">
 <div className={`w-3 h-3 rounded-full bg-${priorityColor}-500`}></div>
 <span className="font-medium text-titanium-900">{step.action}</span>
 </div>
 <p className="text-sm text-titanium-700 mb-2">{step.description}</p>
 <div className="flex justify-between text-xs text-titanium-600">
 <span>{step.timeframe}</span>
 <span>{step.responsible}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Guidelines */}
 <div className="mb-6">
 <h3 className="text-lg font-bold text-titanium-900 mb-4">Guidelines</h3>
 <div className="space-y-3">
 {mockPhenotype.guidelines.map((guideline, index) => (
 <div key={guideline.organization} className="p-3 bg-titanium-50 rounded-lg">
 <div className="font-medium text-titanium-900 text-sm">{guideline.organization}</div>
 <p className="text-xs text-titanium-700 mt-1">{guideline.recommendation}</p>
 <div className="text-xs text-titanium-500 mt-1">{guideline.year}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Related Phenotypes */}
 <div className="mb-6">
 <h3 className="text-lg font-bold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5" />
 Related Phenotypes
 </h3>
 <div className="space-y-2">
 {mockPhenotype.relatedPhenotypes.map((related, index) => (
 <div key={related} className="p-2 bg-titanium-100 rounded text-sm text-titanium-700">
 {related}
 </div>
 ))}
 </div>
 </div>

 {/* Treatment Implications */}
 <div className="mb-6">
 <h3 className="text-lg font-bold text-titanium-900 mb-4">Treatment Implications</h3>
 <div className="space-y-2">
 {mockPhenotype.treatmentImplications.map((implication, index) => (
 <div key={implication} className="flex items-start gap-2">
 <div className="w-2 h-2 rounded-full bg-porsche-500 flex-shrink-0 mt-1.5"></div>
 <span className="text-sm text-titanium-700">{implication}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex justify-center gap-3 mt-8 pt-6 border-t border-titanium-200">
 <button
 onClick={() => {
 console.log('Updating phenotype status for:', phenotype.id);
 {}
 }}
 className="bg-porsche-500 text-white py-2 px-4 rounded-lg hover:bg-porsche-600 transition-colors"
 >
 Update Status
 </button>
 <button
 onClick={() => {
 console.log('Scheduling workup for:', phenotype.name);
 {}
 }}
 className="bg-white border border-titanium-300 text-titanium-700 py-2 px-4 rounded-lg hover:bg-titanium-50 transition-colors"
 >
 Schedule Workup
 </button>
 <button
 onClick={() => {
 console.log('Generating phenotype report for:', phenotype.name);
 {}
 }}
 className="bg-white border border-titanium-300 text-titanium-700 py-2 px-4 rounded-lg hover:bg-titanium-50 transition-colors"
 >
 Generate Report
 </button>
 </div>
 </div>
 </div>
 </div>
  );
};

export default PhenotypeDetailModal;