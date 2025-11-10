// Electrophysiology Executive Dashboard Configuration
export const electrophysiologyConfig = {
  moduleName: 'Electrophysiology',
  
  // Main KPI Data for cards
  kpiData: {
    totalPatients: '3,847',
    totalPatientsSub: 'AFib prevalence: 24.8%',
    
    totalOpportunity: '$94.4M',
    totalOpportunitySub: 'Annual revenue opportunity',
    
    gdmtOptimization: '87%',
    gdmtOptimizationSub: 'Patients on optimal anticoagulation',
    
    avgRoi: '$51,200',
    avgRoiSub: 'Average revenue per patient annually'
  },
  
  // DRG Performance and Optimization
  drgTitle: 'Electrophysiology DRG Performance & Revenue Impact',
  drgDescription: 'Device implantation and ablation procedure financial performance with optimization opportunities',
  
  drgOpportunities: [
    {
      opportunity: 'LAAC Device Optimization',
      impact: '$18.6M',
      patients: 347,
      timeframe: '9 months',
      description: 'Left atrial appendage closure for high-risk AFib patients'
    },
    {
      opportunity: 'Ablation Success Optimization',
      impact: '$24.8M', 
      patients: 892,
      timeframe: '12 months',
      description: 'Advanced mapping and personalized ablation strategies'
    },
    {
      opportunity: 'CRT-D Upgrade Pathways',
      impact: '$12.4M',
      patients: 156,
      timeframe: '6 months', 
      description: 'Cardiac resynchronization therapy device upgrades'
    },
    {
      opportunity: 'Anticoagulation Decision Support',
      impact: '$8.9M',
      patients: 2847,
      timeframe: '3 months',
      description: 'AI-powered bleeding vs stroke risk optimization'
    },
    {
      opportunity: 'Device Remote Monitoring',
      impact: '$5.2M',
      patients: 1650,
      timeframe: '6 months',
      description: 'Remote patient monitoring revenue optimization'
    }
  ],
  
  drgPerformanceCards: [
    {
      title: 'Cardiac Defibrillator Implant (DRG 222)',
      value: '$28.4M',
      caseCount: '347 cases annually',
      variance: '+$4.2M vs benchmark',
      isPositive: true
    },
    {
      title: 'Electrophysiology Procedure (DRG 224)', 
      value: '$18.6M',
      caseCount: '892 cases annually',
      variance: '+$2.8M vs benchmark',
      isPositive: true
    },
    {
      title: 'Other Circulatory Procedures (DRG 228)',
      value: '$12.4M',
      caseCount: '456 cases annually',
      variance: '-$640K vs benchmark',
      isPositive: false
    }
  ],
  
  drgMetrics: {
    currentCMI: '3.42',
    monthlyOpportunity: '$7.8M',
    documentationRate: '94.7%',
    avgLOS: '2.1 days',
    losBenchmark: '-0.4 days vs benchmark'
  }
};