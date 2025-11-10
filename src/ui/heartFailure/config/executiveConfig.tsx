// Heart Failure Executive Dashboard Configuration
export const heartFailureConfig = {
  moduleName: 'Heart Failure',
  
  // Main KPI Data for cards
  kpiData: {
    totalPatients: '7,700',
    totalPatientsSub: '3-month readmission: 12.2%',
    
    totalOpportunity: '$68.8M',
    totalOpportunitySub: 'Annual revenue opportunity',
    
    gdmtOptimization: '38%',
    gdmtOptimizationSub: 'Patients on optimal 4-pillar therapy',
    
    avgRoi: '$27,600',
    avgRoiSub: 'Average revenue per patient annually'
  },
  
  // DRG Performance and Optimization
  drgTitle: 'Heart Failure DRG Performance & Revenue Impact',
  drgDescription: 'DRG-based financial performance with optimization opportunities across heart failure service line',
  
  drgOpportunities: [
    {
      opportunity: 'GDMT 4-Pillar Optimization',
      impact: '$8.9M',
      patients: 2847,
      timeframe: '12 months',
      description: 'Revenue from optimizing patients to guideline-directed medical therapy'
    },
    {
      opportunity: 'Device Eligibility Assessment',
      impact: '$12.4M', 
      patients: 385,
      timeframe: '6 months',
      description: 'ICD/CRT device implantation opportunities for eligible patients'
    },
    {
      opportunity: 'HFpEF Phenotype Detection',
      impact: '$6.2M',
      patients: 1250,
      timeframe: '9 months', 
      description: 'Advanced phenotyping for preserved EF patients'
    },
    {
      opportunity: 'Documentation & CDI Enhancement',
      impact: '$4.8M',
      patients: 892,
      timeframe: '3 months',
      description: 'CC/MCC capture rate improvement through enhanced documentation'
    },
    {
      opportunity: '340B Drug Optimization',
      impact: '$2.1M',
      patients: 1650,
      timeframe: '6 months',
      description: 'Pharmacy cost savings through 340B program optimization'
    }
  ],
  
  drgPerformanceCards: [
    {
      title: 'HF w/ MCC (DRG 291)',
      value: '$18.2M',
      caseCount: '642 cases annually',
      variance: '+$2.4M vs benchmark',
      isPositive: true
    },
    {
      title: 'HF w/ CC (DRG 292)', 
      value: '$24.6M',
      caseCount: '1,247 cases annually',
      variance: '+$1.8M vs benchmark',
      isPositive: true
    },
    {
      title: 'HF w/o CC/MCC (DRG 293)',
      value: '$8.4M',
      caseCount: '892 cases annually',
      variance: '-$840K vs benchmark',
      isPositive: false
    }
  ],
  
  drgMetrics: {
    currentCMI: '2.28',
    monthlyOpportunity: '$2.4M',
    documentationRate: '91.2%',
    avgLOS: '3.8 days',
    losBenchmark: '-0.2 days vs benchmark'
  }
};