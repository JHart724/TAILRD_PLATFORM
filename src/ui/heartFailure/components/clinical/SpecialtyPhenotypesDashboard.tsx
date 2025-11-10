import React, { useState } from 'react';
import { Heart, Search, AlertTriangle, DollarSign, TrendingUp, Users, Activity } from 'lucide-react';

interface PhenotypeData {
  id: string;
  name: string;
  prevalence: string;
  utilization: string;
  triggers: string[];
  interventions: string[];
  revenue: string;
  citation: string;
  riskLevel: 'high' | 'moderate' | 'low';
  identifiedPatients: number;
  eligiblePatients: number;
  revenueGap: number;
}

const SPECIALTY_PHENOTYPES: PhenotypeData[] = [
  {
    id: 'amyloidosis',
    name: 'Cardiac Amyloidosis (ATTR/AL)',
    prevalence: '13-20% of HFpEF >65',
    utilization: '<10%',
    triggers: ['LVH + low ECG voltage', 'neuropathy', 'carpal tunnel', 'Afro-Caribbean ethnicity'],
    interventions: ['PYP scan', 'tafamidis therapy', 'amyloid specialty clinic'],
    revenue: '$25,000-$100,000/year',
    citation: 'JACC HF 2019; Gillmore NEJM 2018',
    riskLevel: 'high',
    identifiedPatients: 12,
    eligiblePatients: 186,
    revenueGap: 8750000
  },
  {
    id: 'hcm',
    name: 'Hypertrophic Cardiomyopathy',
    prevalence: '~0.2% of general population',
    utilization: '~30-40%',
    triggers: ['Unexplained LVH', 'family history of SCD', 'abnormal ECG', 'SAM on echo'],
    interventions: ['Genetic testing', 'mavacamten', 'ICD if high risk'],
    revenue: '$10,000-$40,000',
    citation: 'ACC 2020; Circulation 2021',
    riskLevel: 'moderate',
    identifiedPatients: 8,
    eligiblePatients: 25,
    revenueGap: 425000
  },
  {
    id: 'iron-deficiency',
    name: 'Iron Deficiency',
    prevalence: '~50% of HF patients',
    utilization: '~5-10%',
    triggers: ['Ferritin <100 ng/mL', 'TSAT <20%', 'fatigue', 'poor exercise tolerance'],
    interventions: ['IV iron repletion', 'ferric carboxymaltose'],
    revenue: '$2,000-$3,500/year',
    citation: 'Yeo et al., ESC HF 2020',
    riskLevel: 'high',
    identifiedPatients: 67,
    eligiblePatients: 623,
    revenueGap: 1390000
  },
  {
    id: 'fabry',
    name: 'Fabry Disease',
    prevalence: '0.5-1% of unexplained LVH',
    utilization: '<5%',
    triggers: ['LVH + proteinuria', 'neuropathy', 'angiokeratomas', 'family hx'],
    interventions: ['Enzyme replacement', 'genetic counseling'],
    revenue: '$100,000-$250,000/year',
    citation: 'JIMD Rep 2013; AHA Genetics 2020',
    riskLevel: 'high',
    identifiedPatients: 1,
    eligiblePatients: 8,
    revenueGap: 1225000
  },
  {
    id: 'chagas',
    name: 'Chagas Cardiomyopathy',
    prevalence: '0.1-0.3% in U.S. HF',
    utilization: '<10%',
    triggers: ['Dilated CM + Latin American origin', 'RBBB', 'apical aneurysm'],
    interventions: ['Serologic testing', 'anti-trypanosomal therapy', 'arrhythmia monitoring'],
    revenue: '$3,000-$7,000',
    citation: 'AHA 2020; Circulation 2019',
    riskLevel: 'moderate',
    identifiedPatients: 2,
    eligiblePatients: 4,
    revenueGap: 10000
  },
  {
    id: 'sarcoidosis',
    name: 'Cardiac Sarcoidosis',
    prevalence: '~0.1-0.2% of HF',
    utilization: '<10%',
    triggers: ['AV block', 'VT', 'hilar lymphadenopathy', 'patchy LGE on MRI'],
    interventions: ['PET scan', 'immunosuppressive therapy'],
    revenue: '$10,000-$20,000',
    citation: 'JACC Imaging 2016; AHA HF Guidelines 2022',
    riskLevel: 'moderate',
    identifiedPatients: 1,
    eligiblePatients: 2,
    revenueGap: 15000
  },
  {
    id: 'tachycardia-cm',
    name: 'Tachycardia-Induced CM',
    prevalence: '~5-10% of new HFrEF',
    utilization: '~50%',
    triggers: ['Persistent AF with RVR', 'PVC burden >10%', 'frequent SVT'],
    interventions: ['Ablation', 'rhythm control may normalize EF'],
    revenue: '$15,000-$25,000',
    citation: 'EHJ 2019; ACC EP Guidelines',
    riskLevel: 'moderate',
    identifiedPatients: 31,
    eligiblePatients: 62,
    revenueGap: 620000
  },
  {
    id: 'peripartum',
    name: 'Peripartum Cardiomyopathy',
    prevalence: '1 in 1,000-4,000 live births',
    utilization: 'Rare/Uncertain',
    triggers: ['HF onset late pregnancy to 5 months postpartum'],
    interventions: ['GDMT', 'bromocriptine in Europe', 'close OB follow-up'],
    revenue: '$2,000-$10,000',
    citation: 'ESC PPCM Statement 2018',
    riskLevel: 'low',
    identifiedPatients: 3,
    eligiblePatients: 3,
    revenueGap: 0
  },
  {
    id: 'chemo-induced',
    name: 'Chemotherapy-Induced CM',
    prevalence: '~5-10% of cancer patients',
    utilization: '~20-30%',
    triggers: ['History of anthracyclines/trastuzumab', 'new EF decline'],
    interventions: ['Cardio-oncology referral', 'GDMT initiation', 'EF surveillance'],
    revenue: '$5,000-$15,000',
    citation: 'JACC CardioOncology 2019; ASCO Guidelines',
    riskLevel: 'moderate',
    identifiedPatients: 18,
    eligiblePatients: 45,
    revenueGap: 270000
  },
  {
    id: 'non-compaction',
    name: 'Non-Compaction CM',
    prevalence: '0.05-0.3%',
    utilization: 'Unknown',
    triggers: ['Prominent trabeculations on echo or MRI', 'LV dysfunction'],
    interventions: ['Anticoagulation', 'ICD evaluation', 'genetic workup'],
    revenue: '$10,000-$25,000',
    citation: 'JACC Imaging 2015; AHA HF Guidelines 2022',
    riskLevel: 'moderate',
    identifiedPatients: 1,
    eligiblePatients: 4,
    revenueGap: 52500
  },
  {
    id: 'autoimmune',
    name: 'Autoimmune-Related CM',
    prevalence: '~1-3% of HF patients',
    utilization: 'Unknown',
    triggers: ['New HF in patients with SLE', 'RA', 'systemic sclerosis'],
    interventions: ['Myocarditis evaluation', 'immunosuppression', 'serial imaging'],
    revenue: '$5,000-$20,000',
    citation: 'JACC 2020; ESC HF Guidelines',
    riskLevel: 'moderate',
    identifiedPatients: 4,
    eligiblePatients: 25,
    revenueGap: 262500
  },
  {
    id: 'anderson-fabry',
    name: 'Anderson-Fabry CM',
    prevalence: 'Subset of LVH cases in males <50',
    utilization: '<5%',
    triggers: ['LVH', 'family history', 'neuropathic pain', 'angiokeratomas'],
    interventions: ['Alpha-Gal A testing', 'enzyme therapy'],
    revenue: '$100,000-$250,000/year',
    citation: 'Circulation 2003; AHA Genetics 2020',
    riskLevel: 'high',
    identifiedPatients: 0,
    eligiblePatients: 3,
    revenueGap: 525000
  }
];

const SpecialtyPhenotypesDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'gap'>('gap');

  const filteredPhenotypes = SPECIALTY_PHENOTYPES
    .filter(phenotype => {
      const matchesSearch = phenotype.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          phenotype.triggers.some(trigger => trigger.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRisk = selectedRisk === 'all' || phenotype.riskLevel === selectedRisk;
      return matchesSearch && matchesRisk;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'revenue':
          return b.revenueGap - a.revenueGap;
        case 'gap':
          return (b.eligiblePatients - b.identifiedPatients) - (a.eligiblePatients - a.identifiedPatients);
        default:
          return 0;
      }
    });

  const totalEligible = SPECIALTY_PHENOTYPES.reduce((sum, p) => sum + p.eligiblePatients, 0);
  const totalIdentified = SPECIALTY_PHENOTYPES.reduce((sum, p) => sum + p.identifiedPatients, 0);
  const totalRevenueGap = SPECIALTY_PHENOTYPES.reduce((sum, p) => sum + p.revenueGap, 0);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-deep-red-600 bg-deep-red-50 border-deep-red-200';
      case 'moderate': return 'text-deep-amber-600 bg-deep-amber-50 border-deep-amber-200';
      case 'low': return 'text-deep-green-600 bg-deep-green-50 border-deep-green-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="retina-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-8 h-8 text-medical-blue-500" />
          <div>
            <h2 className="text-3xl font-bold text-steel-900 font-sf">Beyond GDMT: Specialty Phenotypes</h2>
            <p className="text-steel-600">Advanced HF phenotype identification and revenue optimization</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-medical-blue-600 font-sf">{totalEligible}</div>
            <div className="text-sm text-medical-blue-700">Total Eligible Patients</div>
          </div>
          <div className="p-4 bg-deep-green-50 border border-deep-green-200 rounded-lg">
            <div className="text-2xl font-bold text-deep-green-600 font-sf">{totalIdentified}</div>
            <div className="text-sm text-deep-green-700">Currently Identified</div>
          </div>
          <div className="p-4 bg-deep-amber-50 border border-deep-amber-200 rounded-lg">
            <div className="text-2xl font-bold text-deep-amber-600 font-sf">{totalEligible - totalIdentified}</div>
            <div className="text-sm text-deep-amber-700">Unidentified Patients</div>
          </div>
          <div className="p-4 bg-deep-red-50 border border-deep-red-200 rounded-lg">
            <div className="text-2xl font-bold text-deep-red-600 font-sf">${(totalRevenueGap / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-deep-red-700">Revenue Opportunity</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search phenotypes or triggers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
            />
          </div>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-4 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="moderate">Moderate Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'revenue' | 'gap')}
            className="px-4 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="gap">Sort by Patient Gap</option>
            <option value="revenue">Sort by Revenue Gap</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Phenotypes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPhenotypes.map((phenotype) => (
          <div key={phenotype.id} className="retina-card p-6 hover:shadow-retina-3 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-steel-900 mb-2">{phenotype.name}</h3>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getRiskColor(phenotype.riskLevel)}`}>
                  {phenotype.riskLevel.toUpperCase()} PRIORITY
                </div>
              </div>
              <Heart className="w-6 h-6 text-medical-blue-500" />
            </div>

            {/* Patient Numbers */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-steel-50 rounded-lg">
                <div className="text-lg font-bold text-steel-900">{phenotype.eligiblePatients}</div>
                <div className="text-xs text-steel-600">Eligible</div>
              </div>
              <div className="text-center p-3 bg-deep-green-50 rounded-lg">
                <div className="text-lg font-bold text-deep-green-600">{phenotype.identifiedPatients}</div>
                <div className="text-xs text-deep-green-700">Identified</div>
              </div>
              <div className="text-center p-3 bg-deep-red-50 rounded-lg">
                <div className="text-lg font-bold text-deep-red-600">{phenotype.eligiblePatients - phenotype.identifiedPatients}</div>
                <div className="text-xs text-deep-red-700">Missed</div>
              </div>
            </div>

            {/* Clinical Info */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-steel-700 mb-1">Prevalence</div>
                <div className="text-sm text-steel-600">{phenotype.prevalence}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-steel-700 mb-1">Current Utilization</div>
                <div className="text-sm text-steel-600">{phenotype.utilization}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-steel-700 mb-1">Clinical Triggers</div>
                <div className="flex flex-wrap gap-1">
                  {phenotype.triggers.slice(0, 3).map((trigger, index) => (
                    <span key={index} className="px-2 py-1 bg-medical-blue-100 text-medical-blue-700 text-xs rounded">
                      {trigger}
                    </span>
                  ))}
                  {phenotype.triggers.length > 3 && (
                    <span className="px-2 py-1 bg-steel-100 text-steel-600 text-xs rounded">
                      +{phenotype.triggers.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Revenue Impact */}
            <div className="flex items-center justify-between p-3 bg-medical-green-50 border border-medical-green-200 rounded-lg">
              <div>
                <div className="text-sm font-semibold text-medical-green-800">Revenue Opportunity</div>
                <div className="text-xs text-medical-green-600">{phenotype.revenue}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-medical-green-700">
                  ${(phenotype.revenueGap / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-medical-green-600">Gap</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button 
                className="flex-1 px-3 py-2 bg-medical-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-medical-blue-600 transition-colors"
                onClick={() => {
                  console.log('Opening phenotype patient screening');
                  // TODO: Implement phenotype patient screening workflow
                  alert('Screen Patients - Specialty phenotype patient screening tool will open');
                }}
              >
                Screen Patients
              </button>
              <button 
                className="px-3 py-2 border border-steel-300 text-steel-700 text-sm font-semibold rounded-lg hover:bg-steel-50 transition-colors"
                onClick={() => {
                  console.log('Opening phenotype protocol');
                  // TODO: Implement phenotype protocol viewer
                  alert('View Protocol - Specialty phenotype screening protocol will open');
                }}
              >
                View Protocol
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Panel */}
      <div className="retina-card p-6">
        <h3 className="text-xl font-bold text-steel-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          <button 
            className="p-4 border-2 border-deep-red-200 rounded-lg hover:bg-deep-red-50 transition-colors"
            onClick={() => {
              console.log('Opening high-risk patient alerts');
              // TODO: Implement high-risk alerts dashboard
              alert('High-Risk Alerts - Critical patient alerts requiring immediate attention');
            }}
          >
            <AlertTriangle className="w-6 h-6 text-deep-red-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-deep-red-800">High-Risk Alerts</div>
            <div className="text-xs text-deep-red-600">3 patients need immediate screening</div>
          </button>
          <button 
            className="p-4 border-2 border-medical-blue-200 rounded-lg hover:bg-medical-blue-50 transition-colors"
            onClick={() => {
              console.log('Opening population screening tool');
              // TODO: Implement population screening workflow
              alert('Population Screening - Bulk phenotype analysis tool will open');
            }}
          >
            <Users className="w-6 h-6 text-medical-blue-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-medical-blue-800">Population Screening</div>
            <div className="text-xs text-medical-blue-600">Run bulk phenotype analysis</div>
          </button>
          <button 
            className="p-4 border-2 border-medical-green-200 rounded-lg hover:bg-medical-green-50 transition-colors"
            onClick={() => {
              console.log('Generating revenue opportunity report');
              // TODO: Implement revenue report generator
              alert('Revenue Report - Phenotype opportunity analysis report will be generated');
            }}
          >
            <DollarSign className="w-6 h-6 text-medical-green-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-medical-green-800">Revenue Report</div>
            <div className="text-xs text-medical-green-600">Generate opportunity analysis</div>
          </button>
          <button 
            className="p-4 border-2 border-deep-amber-200 rounded-lg hover:bg-deep-amber-50 transition-colors"
            onClick={() => {
              console.log('Opening protocol builder');
              // TODO: Implement protocol builder tool
              alert('Protocol Builder - Custom screening workflow builder will open');
            }}
          >
            <Activity className="w-6 h-6 text-deep-amber-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-deep-amber-800">Protocol Builder</div>
            <div className="text-xs text-deep-amber-600">Create screening workflows</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpecialtyPhenotypesDashboard;