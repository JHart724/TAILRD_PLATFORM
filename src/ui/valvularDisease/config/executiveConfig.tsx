// Valvular Disease Executive Dashboard Configuration
export const valvularDiseaseConfig = {
  moduleName: 'Valvular Disease',
  
  // Main KPI Data for cards
  kpiData: {
    totalPatients: '1,342',
    totalPatientsSub: 'Severe AS prevalence: 12.6%',
    
    totalOpportunity: '$51.7M',
    totalOpportunitySub: 'Annual revenue opportunity',
    
    gdmtOptimization: '71%',
    gdmtOptimizationSub: 'Patients receiving optimal therapy',
    
    avgRoi: '$38,500',
    avgRoiSub: 'Average revenue per patient annually'
  },
  
  // DRG Performance and Optimization
  drgTitle: 'Valvular Disease DRG Performance & Revenue Impact',
  drgDescription: 'Valve repair, replacement, and intervention financial performance with optimization opportunities',
  
  drgOpportunities: [
    {
      opportunity: 'Valve Severity Assessment',
      impact: '$12.6M',
      patients: 892,
      timeframe: '8 months',
      description: 'Systematic echocardiographic assessment and grading standardization'
    },
    {
      opportunity: 'Surgical vs Interventional Decision',
      impact: '$18.4M', 
      patients: 247,
      timeframe: '12 months',
      description: 'Heart team-based treatment decision optimization'
    },
    {
      opportunity: 'Echo Integration Workflows',
      impact: '$8.2M',
      patients: 1156,
      timeframe: '6 months', 
      description: 'Automated echo interpretation and clinical correlation'
    },
    {
      opportunity: 'Guideline Implementation',
      impact: '$6.8M',
      patients: 456,
      timeframe: '9 months',
      description: 'ACC/AHA valve guidelines implementation and adherence'
    },
    {
      opportunity: 'Follow-up Protocol Optimization',
      impact: '$4.2M',
      patients: 678,
      timeframe: '4 months',
      description: 'Post-intervention surveillance and long-term management'
    }
  ],
  
  drgPerformanceCards: [
    {
      title: 'Valve Procedures w/ MCC (DRG 216)',
      value: '$24.8M',
      caseCount: '156 cases annually',
      variance: '+$4.2M vs benchmark',
      isPositive: true
    },
    {
      title: 'Valve Procedures w/ CC (DRG 217)', 
      value: '$18.6M',
      caseCount: '247 cases annually',
      variance: '+$2.8M vs benchmark',
      isPositive: true
    },
    {
      title: 'Valve Procedures w/o CC/MCC (DRG 218)',
      value: '$8.4M',
      caseCount: '89 cases annually',
      variance: '-$1.6M vs benchmark',
      isPositive: false
    }
  ],
  
  drgMetrics: {
    currentCMI: '2.12',
    monthlyOpportunity: '$4.3M',
    documentationRate: '91.4%',
    avgLOS: '6.8 days',
    losBenchmark: '+0.6 days vs benchmark'
  }
};