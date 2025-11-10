// Coronary Intervention Executive Dashboard Configuration
export const coronaryInterventionConfig = {
  moduleName: 'Coronary Intervention',
  
  // Main KPI Data for cards
  kpiData: {
    totalPatients: '2,847',
    totalPatientsSub: 'STEMI incidence: 8.4%',
    
    totalOpportunity: '$89.4M',
    totalOpportunitySub: 'Annual revenue opportunity',
    
    gdmtOptimization: '94%',
    gdmtOptimizationSub: 'Procedural success rate',
    
    avgRoi: '$31,400',
    avgRoiSub: 'Average revenue per patient annually'
  },
  
  // DRG Performance and Optimization
  drgTitle: 'Coronary Intervention DRG Performance & Revenue Impact',
  drgDescription: 'PCI, CABG, and coronary diagnostic procedure financial performance with optimization opportunities',
  
  drgOpportunities: [
    {
      opportunity: 'STEMI Protocol Optimization',
      impact: '$18.6M',
      patients: 247,
      timeframe: '6 months',
      description: 'Door-to-balloon time optimization and STEMI network enhancement'
    },
    {
      opportunity: 'Complex PCI Program',
      impact: '$24.8M', 
      patients: 456,
      timeframe: '9 months',
      description: 'Chronic total occlusion and complex lesion PCI procedures'
    },
    {
      opportunity: 'Fractional Flow Reserve (FFR)',
      impact: '$12.4M',
      patients: 892,
      timeframe: '8 months', 
      description: 'Physiologic lesion assessment and optimization'
    },
    {
      opportunity: 'Cath Lab Efficiency',
      impact: '$8.9M',
      patients: 1547,
      timeframe: '4 months',
      description: 'Throughput optimization and procedural efficiency'
    },
    {
      opportunity: 'Drug-Eluting Stent Optimization',
      impact: '$6.2M',
      patients: 782,
      timeframe: '3 months',
      description: 'Stent selection and dual antiplatelet therapy optimization'
    }
  ],
  
  drgPerformanceCards: [
    {
      title: 'PTCA w/ Drug-Eluting Stent (DRG 246)',
      value: '$34.8M',
      caseCount: '892 cases annually',
      variance: '+$4.2M vs benchmark',
      isPositive: true
    },
    {
      title: 'PTCA w/o Drug-Eluting Stent (DRG 247)', 
      value: '$18.6M',
      caseCount: '456 cases annually',
      variance: '+$2.1M vs benchmark',
      isPositive: true
    },
    {
      title: 'Cardiac Catheterization (DRG 252)',
      value: '$12.4M',
      caseCount: '1547 cases annually',
      variance: '-$1.2M vs benchmark',
      isPositive: false
    }
  ],
  
  drgMetrics: {
    currentCMI: '2.94',
    monthlyOpportunity: '$7.4M',
    documentationRate: '93.8%',
    avgLOS: '2.8 days',
    losBenchmark: '-0.4 days vs benchmark'
  }
};