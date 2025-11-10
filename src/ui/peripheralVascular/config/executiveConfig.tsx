// Peripheral Vascular Executive Dashboard Configuration
export const peripheralVascularConfig = {
  moduleName: 'Peripheral Vascular',
  
  // Main KPI Data for cards
  kpiData: {
    totalPatients: '1,847',
    totalPatientsSub: 'CLI incidence: 15.2%',
    
    totalOpportunity: '$42.3M',
    totalOpportunitySub: 'Annual revenue opportunity',
    
    gdmtOptimization: '62%',
    gdmtOptimizationSub: 'Patients on optimal PAD therapy',
    
    avgRoi: '$22,900',
    avgRoiSub: 'Average revenue per patient annually'
  },
  
  // DRG Performance and Optimization
  drgTitle: 'Peripheral Vascular DRG Performance & Revenue Impact',
  drgDescription: 'PAD interventions, limb salvage, and wound care financial performance with optimization opportunities',
  
  drgOpportunities: [
    {
      opportunity: 'PAD Screening Program',
      impact: '$8.6M',
      patients: 1247,
      timeframe: '9 months',
      description: 'Systematic peripheral artery disease screening and early intervention'
    },
    {
      opportunity: 'Limb Salvage Optimization',
      impact: '$12.4M', 
      patients: 156,
      timeframe: '6 months',
      description: 'Critical limb ischemia intervention and amputation prevention'
    },
    {
      opportunity: 'Wound Care Coordination',
      impact: '$6.8M',
      patients: 892,
      timeframe: '12 months', 
      description: 'Multidisciplinary wound care and healing optimization'
    },
    {
      opportunity: 'Endovascular Intervention',
      impact: '$9.2M',
      patients: 347,
      timeframe: '8 months',
      description: 'Balloon angioplasty and stent placement optimization'
    },
    {
      opportunity: 'WIfI Classification System',
      impact: '$3.8M',
      patients: 456,
      timeframe: '4 months',
      description: 'Wound, Ischemia, and foot Infection assessment standardization'
    }
  ],
  
  drgPerformanceCards: [
    {
      title: 'Peripheral Vascular Procedures (DRG 252)',
      value: '$18.4M',
      caseCount: '347 cases annually',
      variance: '+$2.8M vs benchmark',
      isPositive: true
    },
    {
      title: 'Amputation Procedures (DRG 113)', 
      value: '$8.6M',
      caseCount: '89 cases annually',
      variance: '-$1.2M vs benchmark',
      isPositive: false
    },
    {
      title: 'Other Vascular Procedures (DRG 253)',
      value: '$12.4M',
      caseCount: '456 cases annually',
      variance: '+$1.8M vs benchmark',
      isPositive: true
    }
  ],
  
  drgMetrics: {
    currentCMI: '1.74',
    monthlyOpportunity: '$3.5M',
    documentationRate: '84.6%',
    avgLOS: '3.8 days',
    losBenchmark: '+0.3 days vs benchmark'
  }
};