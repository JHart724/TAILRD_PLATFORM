// Structural Heart Executive Dashboard Configuration
export const structuralHeartConfig = {
  moduleName: 'Structural Heart',
  
  // Main KPI Data for cards
  kpiData: {
    totalPatients: '1,234',
    totalPatientsSub: 'TAVR/SAVR eligible: 18.6%',
    
    totalOpportunity: '$127.8M',
    totalOpportunitySub: 'Annual revenue opportunity',
    
    gdmtOptimization: '92%',
    gdmtOptimizationSub: 'Procedural success rate',
    
    avgRoi: '$103,600',
    avgRoiSub: 'Average revenue per patient annually'
  },
  
  // DRG Performance and Optimization
  drgTitle: 'Structural Heart DRG Performance & Revenue Impact',
  drgDescription: 'TAVR, SAVR, and mitral intervention financial performance with optimization opportunities',
  
  drgOpportunities: [
    {
      opportunity: 'TAVR Program Expansion',
      impact: '$42.6M',
      patients: 247,
      timeframe: '12 months',
      description: 'Transcatheter aortic valve replacement program optimization'
    },
    {
      opportunity: 'MitraClip/TEER Procedures',
      impact: '$28.4M', 
      patients: 156,
      timeframe: '9 months',
      description: 'Transcatheter edge-to-edge repair for mitral regurgitation'
    },
    {
      opportunity: 'Heart Team Coordination',
      impact: '$18.2M',
      patients: 347,
      timeframe: '6 months', 
      description: 'Multidisciplinary heart team decision optimization'
    },
    {
      opportunity: 'Valve-in-Valve Procedures',
      impact: '$12.8M',
      patients: 89,
      timeframe: '8 months',
      description: 'Failed bioprosthetic valve interventions'
    },
    {
      opportunity: 'Patient Selection Optimization',
      impact: '$8.6M',
      patients: 456,
      timeframe: '4 months',
      description: 'AI-powered risk assessment and patient selection'
    }
  ],
  
  drgPerformanceCards: [
    {
      title: 'Valve Procedures w/ Pump (DRG 216)',
      value: '$68.4M',
      caseCount: '247 cases annually',
      variance: '+$12.8M vs benchmark',
      isPositive: true
    },
    {
      title: 'Valve Procedures w/o Pump (DRG 217)', 
      value: '$34.6M',
      caseCount: '156 cases annually',
      variance: '+$6.8M vs benchmark',
      isPositive: true
    },
    {
      title: 'Other Cardiothoracic Procedures (DRG 221)',
      value: '$18.4M',
      caseCount: '89 cases annually',
      variance: '-$2.1M vs benchmark',
      isPositive: false
    }
  ],
  
  drgMetrics: {
    currentCMI: '4.84',
    monthlyOpportunity: '$10.6M',
    documentationRate: '96.3%',
    avgLOS: '4.7 days',
    losBenchmark: '-0.5 days vs benchmark'
  }
};