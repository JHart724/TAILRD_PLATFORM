import React, { useState } from 'react';
import { Search, AlertTriangle, Activity, Heart, Zap, Shield, Eye, Flame, Users, TrendingUp } from 'lucide-react';
interface PhenotypeData { id: string; name: string; prevalence: string; detectionRate: number; clinicalFeatures: string[]; diagnosticCriteria: string[]; managementPriority: 'Critical' | 'High' | 'Moderate' | 'Standard'; patientGap: number; totalEstimated: number; category: 'ischemic' | 'inflammatory' | 'structural' | 'metabolic'; }
const PAD_PHENOTYPES: PhenotypeData[] = [
  { id: 'clti', name: 'Chronic Limb-Threatening Ischemia (CLTI)', prevalence: '11-15%', detectionRate: 65, clinicalFeatures: ['Rest pain > 2 weeks', 'Non-healing ulcers/gangrene', 'Ankle pressure < 50 mmHg', 'Toe pressure < 30 mmHg'], diagnosticCriteria: ['Rutherford 4-6', 'WIfI classification', 'Tissue loss with ischemia'], managementPriority: 'Critical', patientGap: 44, totalEstimated: 186, category: 'ischemic' },
  { id: 'diabetic-foot', name: 'Diabetic Foot Syndrome', prevalence: '15-25% of diabetic PAD', detectionRate: 55, clinicalFeatures: ['Neuropathic ulceration', 'Charcot neuroarthropathy', 'Pedal arch disease', 'Calcified tibial arteries'], diagnosticCriteria: ['Wagner classification', 'TBI < 0.7', 'Monofilament testing abnormal', 'Infrapopliteal calcification'], managementPriority: 'Critical', patientGap: 68, totalEstimated: 248, category: 'metabolic' },
  { id: 'blue-toe', name: 'Blue Toe Syndrome', prevalence: '2-5%', detectionRate: 40, clinicalFeatures: ['Acute cyanotic digit(s)', 'Livedo reticularis', 'Palpable distal pulses', 'Proximal embolic source'], diagnosticCriteria: ['Cholesterol crystal embolization', 'CTA showing ulcerated plaque', 'Eosinophilia on labs', 'Elevated ESR/CRP'], managementPriority: 'High', patientGap: 22, totalEstimated: 62, category: 'ischemic' },
  { id: 'popliteal-entrapment', name: 'Popliteal Artery Entrapment', prevalence: '<1% (young patients)', detectionRate: 25, clinicalFeatures: ['Claudication in young athletes', 'Absent posterior tibial pulse with plantar flexion', 'No traditional risk factors', 'Exertional leg pain'], diagnosticCriteria: ['Positional duplex ultrasound', 'MRA with dynamic imaging', 'Medial head gastrocnemius anomaly', 'Popliteal artery compression on stress'], managementPriority: 'High', patientGap: 8, totalEstimated: 12, category: 'structural' },
  { id: 'fmd', name: 'Fibromuscular Dysplasia (FMD)', prevalence: '1-3% of PAD referrals', detectionRate: 30, clinicalFeatures: ['Young to middle-aged women', 'String-of-beads on angiography', 'Multivessel involvement', 'Renal and carotid FMD'], diagnosticCriteria: ['CTA/MRA showing beading', 'No atherosclerotic risk factors', 'Intimal or medial fibroplasia', 'Multi-territory screening required'], managementPriority: 'High', patientGap: 14, totalEstimated: 24, category: 'structural' },
  { id: 'buerger', name: 'Thromboangiitis Obliterans (Buerger)', prevalence: '<1%', detectionRate: 35, clinicalFeatures: ['Young male smoker', 'Distal small vessel occlusion', 'Migratory thrombophlebitis', 'Raynaud phenomenon'], diagnosticCriteria: ['Age < 45 with smoking history', 'Distal extremity ischemia', 'Allen test abnormal', 'Angiographic corkscrew collaterals'], managementPriority: 'Critical', patientGap: 6, totalEstimated: 10, category: 'inflammatory' },
  { id: 'adventitial-cystic', name: 'Adventitial Cystic Disease', prevalence: '<0.1%', detectionRate: 20, clinicalFeatures: ['Intermittent claudication', 'Young to middle-aged men', 'Scimitar sign on angiography', 'Popliteal artery involvement'], diagnosticCriteria: ['MRI showing cystic lesion', 'Duplex US with cyst', 'No atherosclerotic disease', 'Characteristic angiographic narrowing'], managementPriority: 'Moderate', patientGap: 3, totalEstimated: 5, category: 'structural' },
  { id: 'mals', name: 'Median Arcuate Ligament Syndrome', prevalence: '1-2% of vascular referrals', detectionRate: 30, clinicalFeatures: ['Postprandial abdominal pain', 'Weight loss', 'Epigastric bruit', 'Exercise-related mesenteric ischemia'], diagnosticCriteria: ['CTA with celiac compression', 'Expiratory duplex showing compression', 'Exclude other GI causes', 'Celiac artery peak systolic velocity > 350 cm/s'], managementPriority: 'Moderate', patientGap: 9, totalEstimated: 18, category: 'structural' },
];
const PADSpecialtyPhenotypesDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'gap' | 'detection' | 'priority'>('gap');
  const filtered = PAD_PHENOTYPES.filter(p => (selectedCategory === 'all' || p.category === selectedCategory) && (selectedPriority === 'all' || p.managementPriority === selectedPriority) && (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.clinicalFeatures.some(f => f.toLowerCase().includes(searchTerm.toLowerCase())))).sort((a, b) => { switch (sortBy) { case 'name': return a.name.localeCompare(b.name); case 'gap': return b.patientGap - a.patientGap; case 'detection': return a.detectionRate - b.detectionRate; case 'priority': const order = { Critical: 0, High: 1, Moderate: 2, Standard: 3 }; return order[a.managementPriority] - order[b.managementPriority]; default: return 0; } });
  const totalGap = PAD_PHENOTYPES.reduce((s, p) => s + p.patientGap, 0);
  const avgDetection = Math.round(PAD_PHENOTYPES.reduce((s, p) => s + p.detectionRate, 0) / PAD_PHENOTYPES.length);
  const BULLET = '\u2022';
  const getPriorityColor = (p: string) => p === 'Critical' ? 'text-crimson-600 bg-crimson-50 border-crimson-200' : p === 'High' ? 'text-amber-600 bg-amber-50 border-amber-200' : p === 'Moderate' ? 'text-porsche-600 bg-porsche-50 border-porsche-200' : 'text-green-600 bg-green-50 border-green-200';
  const getCategoryIcon = (c: string) => { switch(c) { case 'ischemic': return <Flame className="w-4 h-4" />; case 'inflammatory': return <Zap className="w-4 h-4" />; case 'structural': return <Shield className="w-4 h-4" />; case 'metabolic': return <Activity className="w-4 h-4" />; default: return <Heart className="w-4 h-4" />; } };
  const getDetectionColor = (d: number) => d < 30 ? 'bg-crimson-500' : d < 50 ? 'bg-amber-500' : d < 70 ? 'bg-porsche-500' : 'bg-green-500';
  return (
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-porsche-50 rounded-xl"><Eye className="w-6 h-6 text-porsche-600" /></div>
 <div><h3 className="text-lg font-bold text-titanium-900 font-sf">PAD Specialty Phenotypes Dashboard</h3>
 <p className="text-sm text-titanium-500">Underdetected PAD phenotypes, diagnostic gaps & clinical features</p></div>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div className="metal-card p-4 text-center"><div className="text-xs text-titanium-500 mb-1">Phenotypes Tracked</div><div className="text-2xl font-bold text-titanium-900">{PAD_PHENOTYPES.length}</div><div className="text-xs text-titanium-500">specialty classifications</div></div>
 <div className="metal-card p-4 text-center"><div className="text-xs text-titanium-500 mb-1">Avg Detection Rate</div><div className="text-2xl font-bold text-amber-600">{avgDetection}%</div><div className="text-xs text-titanium-500">across all phenotypes</div></div>
 <div className="metal-card p-4 text-center"><div className="text-xs text-titanium-500 mb-1">Total Patient Gap</div><div className="text-2xl font-bold text-crimson-600"><Users className="w-5 h-5 inline mr-1" />{totalGap}</div><div className="text-xs text-titanium-500">underdetected patients</div></div>
 </div>
 <div className="flex gap-3 flex-wrap">
 <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-titanium-400" />
 <input type="text" placeholder="Search phenotypes or features..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-liquid w-full text-sm pl-9" /></div>
 <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="input-liquid text-sm">
 <option value="all">All Categories</option><option value="ischemic">Ischemic</option><option value="inflammatory">Inflammatory</option><option value="structural">Structural</option><option value="metabolic">Metabolic</option></select>
 <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="input-liquid text-sm">
 <option value="all">All Priorities</option><option value="Critical">Critical</option><option value="High">High</option><option value="Moderate">Moderate</option></select>
 <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input-liquid text-sm">
 <option value="gap">Sort by Patient Gap</option><option value="detection">Sort by Detection Rate</option><option value="priority">Sort by Priority</option><option value="name">Sort by Name</option></select>
 </div>
 <div className="space-y-4">
 {filtered.map(p => (
 <div key={p.id} className={`metal-card p-5 border ${getPriorityColor(p.managementPriority)}`}>
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">{getCategoryIcon(p.category)}<h4 className="font-semibold text-titanium-900">{p.name}</h4></div>
 <div className="flex items-center gap-2">
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(p.managementPriority)}`}>{p.managementPriority}</span>
 <span className="text-xs text-titanium-500">Prevalence: {p.prevalence}</span>
 </div>
 </div>
 <div className="mb-3">
 <div className="flex justify-between text-xs text-titanium-600 mb-1"><span>Detection Rate: {p.detectionRate}%</span><span>Gap: {p.patientGap} patients</span></div>
 <div className="w-full bg-titanium-100 rounded-full h-2"><div className={`h-full rounded-full ${getDetectionColor(p.detectionRate)}`} style={{width:`${p.detectionRate}%`}} /></div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div><div className="text-xs font-semibold text-titanium-600 mb-1">Clinical Features</div>
 <ul className="space-y-0.5">{p.clinicalFeatures.map((f) => (<li key={f} className="text-xs text-titanium-700 flex items-start gap-1"><span className="text-porsche-500 mt-0.5">{BULLET}</span>{f}</li>))}</ul></div>
 <div><div className="text-xs font-semibold text-titanium-600 mb-1">Diagnostic Criteria</div>
 <ul className="space-y-0.5">{p.diagnosticCriteria.map((d) => (<li key={d} className="text-xs text-titanium-700 flex items-start gap-1"><span className="text-porsche-500 mt-0.5">{BULLET}</span>{d}</li>))}</ul></div>
 </div>
 </div>
 ))}
 </div>
 <div className="metal-card p-5 border border-porsche-200 bg-porsche-50/30">
 <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-porsche-600" /><h4 className="font-semibold text-titanium-900">Detection Gap Analysis</h4></div>
 <ul className="space-y-1 text-sm text-titanium-700">
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>Popliteal Entrapment and Adventitial Cystic Disease have the lowest detection rates - consider in young patients without risk factors</li>
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>Diabetic Foot Syndrome represents the largest absolute patient gap requiring multidisciplinary coordination</li>
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>FMD screening should include head-to-pelvis CTA/MRA for multi-territory involvement</li>
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>Buerger disease requires absolute smoking cessation as cornerstone of management</li>
 </ul>
 </div>
 <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-sm text-amber-800">
 <strong>Guidelines:</strong> 2024 ACC/AHA PAD Guideline; Global Vascular Guidelines on CLTI; TASC II Inter-Society Consensus on PAD.
 </p>
 </div>
 </div>
  );
};
export default PADSpecialtyPhenotypesDashboard;
