/**
 * Complete clinical data for all cardiovascular modules
 * Supports all modals: Facility, Benchmark, DRG, Revenue, Month, Documentation
 * Based on HF module structure - DO NOT modify this structure
 */

export const modulesClinicalData = {
  
  // ========================================
  // ELECTROPHYSIOLOGY
  // ========================================
  electrophysiology: {
 moduleName: 'Electrophysiology',
 totalPatients: 1247,
 
 // Category mapping: Internal (HF) names → Display names
 categoryMapping: {
 'GDMT': 'AF Ablation',
 'Devices': 'Device Implants',
 'Phenotypes': 'LAAC',
 '340B': 'Lead Extraction'
 },
 
 // For HFRevenueWaterfallModal
 revenueCategories: [
 {
 internalName: 'GDMT',
 displayName: 'AF Ablation',
 revenue: 3200000,
 patientCount: 156,
 procedures: ['Pulmonary Vein Isolation', 'Cryoablation', 'RF Ablation'],
 breakdown: [
 { type: 'Complex AF', value: 1800000 },
 { type: 'Paroxysmal AF', value: 1400000 }
 ]
 },
 {
 internalName: 'Devices',
 displayName: 'Device Implants',
 revenue: 2800000,
 patientCount: 234,
 procedures: ['Pacemaker', 'ICD', 'CRT-D', 'Loop Recorder'],
 breakdown: [
 { type: 'CRT-D', value: 1400000 },
 { type: 'ICD', value: 980000 },
 { type: 'Pacemaker', value: 420000 }
 ]
 },
 {
 internalName: 'Phenotypes',
 displayName: 'LAAC',
 revenue: 1400000,
 patientCount: 89,
 procedures: ['Watchman', 'Amulet', 'LAA Closure'],
 breakdown: [
 { type: 'Watchman', value: 980000 },
 { type: 'Amulet', value: 420000 }
 ]
 },
 {
 internalName: '340B',
 displayName: 'Lead Extraction',
 revenue: 980000,
 patientCount: 45,
 procedures: ['Laser Extraction', 'Mechanical Extraction'],
 breakdown: [
 { type: 'Complex Extraction', value: 680000 },
 { type: 'Simple Extraction', value: 300000 }
 ]
 }
 ],
 
 // For HFFacilityDetailModal - ALL required fields
 facilities: [
 {
 name: 'Main Campus Medical Center - Main EP Lab',
 location: '1000 Medical Center Dr, Suite 100',
 totalRevenue: 3200000,
 patientCount: 456,
 gdmtRate: 85,
 captureRate: 92,
 breakdown: [
 { category: 'AF Ablation', revenue: 1800000 },
 { category: 'VT Ablation', revenue: 950000 },
 { category: 'Device Implants', revenue: 450000 }
 ],
 providers: [
 { name: 'Dr. Sarah Chen', patients: 145, gdmtRate: 88, revenueImpact: 425000 },
 { name: 'Dr. Michael Rodriguez', patients: 132, gdmtRate: 82, revenueImpact: 385000 },
 { name: 'Dr. Emily Foster', patients: 98, gdmtRate: 79, revenueImpact: 285000 }
 ]
 },
 {
 name: 'West Campus Medical Center - EP Suite',
 location: '2500 West Medical Blvd, Suite 200',
 totalRevenue: 2800000,
 patientCount: 378,
 gdmtRate: 78,
 captureRate: 88,
 breakdown: [
 { category: 'CRT-D', revenue: 1400000 },
 { category: 'ICD', revenue: 980000 },
 { category: 'Pacemaker', revenue: 420000 }
 ],
 providers: [
 { name: 'Dr. James Wilson', patients: 112, gdmtRate: 84, revenueImpact: 335000 },
 { name: 'Dr. Lisa Park', patients: 89, gdmtRate: 76, revenueImpact: 265000 }
 ]
 },
 {
 name: 'North Campus Hospital - EP Lab',
 location: '4200 North Campus Pkwy, Suite 300',
 totalRevenue: 1400000,
 patientCount: 234,
 gdmtRate: 72,
 captureRate: 76,
 breakdown: [
 { category: 'LAAC', revenue: 980000 },
 { category: 'Structural EP', revenue: 420000 }
 ],
 providers: [
 { name: 'Dr. Robert Kim', patients: 67, gdmtRate: 75, revenueImpact: 195000 },
 { name: 'Dr. Amanda Lee', patients: 54, gdmtRate: 68, revenueImpact: 155000 }
 ]
 },
 {
 name: 'Community Medical Center - EP Unit',
 location: '5500 Community Health Blvd, Suite 400',
 totalRevenue: 980000,
 patientCount: 179,
 gdmtRate: 65,
 captureRate: 67,
 breakdown: [
 { category: 'Lead Extraction', revenue: 680000 },
 { category: 'Device Revision', revenue: 300000 }
 ],
 providers: [
 { name: 'Dr. Thomas Brown', patients: 45, gdmtRate: 62, revenueImpact: 125000 }
 ]
 }
 ],
 
 // For HFBenchmarkDetailModal
 benchmarks: [
 {
 metric: 'AF Ablation Success Rate',
 value: 82,
 benchmark: 75,
 percentile: 85,
 trend: 'up',
 description: 'Freedom from AF at 12 months post-ablation',
 trendData: [
 { month: 'Jun', value: 76 },
 { month: 'Jul', value: 78 },
 { month: 'Aug', value: 79 },
 { month: 'Sep', value: 80 },
 { month: 'Oct', value: 81 },
 { month: 'Nov', value: 82 }
 ]
 },
 {
 metric: 'Device Infection Rate',
 value: 0.8,
 benchmark: 1.5,
 percentile: 78,
 trend: 'down',
 description: 'Device-related infections requiring extraction',
 trendData: [
 { month: 'Jun', value: 1.2 },
 { month: 'Jul', value: 1.1 },
 { month: 'Aug', value: 1.0 },
 { month: 'Sep', value: 0.9 },
 { month: 'Oct', value: 0.85 },
 { month: 'Nov', value: 0.8 }
 ]
 },
 {
 metric: 'Appropriate ICD Therapy',
 value: 91,
 benchmark: 85,
 percentile: 82,
 trend: 'up',
 description: 'Appropriate shocks/ATP for VT/VF',
 trendData: [
 { month: 'Jun', value: 87 },
 { month: 'Jul', value: 88 },
 { month: 'Aug', value: 89 },
 { month: 'Sep', value: 89 },
 { month: 'Oct', value: 90 },
 { month: 'Nov', value: 91 }
 ]
 },
 {
 metric: 'LAAC Device Success',
 value: 97,
 benchmark: 95,
 percentile: 88,
 trend: 'up',
 description: 'Complete LAA seal at 45 days',
 trendData: [
 { month: 'Jun', value: 94 },
 { month: 'Jul', value: 95 },
 { month: 'Aug', value: 96 },
 { month: 'Sep', value: 96 },
 { month: 'Oct', value: 97 },
 { month: 'Nov', value: 97 }
 ]
 },
 {
 metric: 'Anticoagulation Compliance',
 value: 87,
 benchmark: 80,
 percentile: 72,
 trend: 'up',
 description: 'NOACs adherence in AFib patients',
 trendData: [
 { month: 'Jun', value: 83 },
 { month: 'Jul', value: 84 },
 { month: 'Aug', value: 85 },
 { month: 'Sep', value: 86 },
 { month: 'Oct', value: 86 },
 { month: 'Nov', value: 87 }
 ]
 },
 {
 metric: 'Lead Complication Rate',
 value: 1.2,
 benchmark: 2.0,
 percentile: 81,
 trend: 'down',
 description: 'Lead dislodgement or malfunction',
 trendData: [
 { month: 'Jun', value: 1.6 },
 { month: 'Jul', value: 1.5 },
 { month: 'Aug', value: 1.4 },
 { month: 'Sep', value: 1.3 },
 { month: 'Oct', value: 1.25 },
 { month: 'Nov', value: 1.2 }
 ]
 }
 ],
 
 // For HFDRGDetailModal - 12 DRGs in 4 categories
 drgs: [
 // Device Implants
 { code: '241', name: 'Pacemaker w MCC', category: 'Device Implants', reimbursement: 127340, cases: 45, cost: 60200, margin: 52.7, varianceVsBenchmark: 18700 },
 { code: '242', name: 'Pacemaker w CC', category: 'Device Implants', reimbursement: 89760, cases: 135, cost: 42500, margin: 52.6, varianceVsBenchmark: 12400 },
 { code: '244', name: 'Pacemaker w/o CC/MCC', category: 'Device Implants', reimbursement: 67420, cases: 120, cost: 35800, margin: 46.9, varianceVsBenchmark: -3200 },
 // ICD/CRT-D
 { code: '222', name: 'ICD w MCC', category: 'ICD/CRT-D', reimbursement: 189420, cases: 28, cost: 95600, margin: 49.5, varianceVsBenchmark: 24100 },
 { code: '223', name: 'ICD w/o MCC', category: 'ICD/CRT-D', reimbursement: 142680, cases: 67, cost: 72300, margin: 49.3, varianceVsBenchmark: 15800 },
 { code: '264', name: 'Lead Extraction', category: 'ICD/CRT-D', reimbursement: 98540, cases: 22, cost: 52300, margin: 46.9, varianceVsBenchmark: 8900 },
 // Ablation
 { code: '250', name: 'AF Ablation w MCC', category: 'Ablation', reimbursement: 78950, cases: 89, cost: 35200, margin: 55.4, varianceVsBenchmark: 11200 },
 { code: '251', name: 'VT Ablation', category: 'Ablation', reimbursement: 142680, cases: 34, cost: 67800, margin: 52.5, varianceVsBenchmark: 18400 },
 { code: '252', name: 'SVT Ablation', category: 'Ablation', reimbursement: 56780, cases: 112, cost: 24600, margin: 56.7, varianceVsBenchmark: 2100 },
 // Structural EP
 { code: '267', name: 'LAAC w MCC', category: 'Structural EP', reimbursement: 67420, cases: 42, cost: 28900, margin: 57.1, varianceVsBenchmark: 9800 },
 { code: '268', name: 'LAAC w/o MCC', category: 'Structural EP', reimbursement: 54320, cases: 47, cost: 24100, margin: 55.6, varianceVsBenchmark: 5200 },
 { code: '245', name: 'EP Study', category: 'Structural EP', reimbursement: 28450, cases: 78, cost: 12300, margin: 56.7, varianceVsBenchmark: 1800 }
 ],
 
 // For HFMonthDetailModal
 monthlyData: [
 { month: 'Jan', projected: 850000, realized: 520000, breakdown: [
 { category: 'GDMT', projected: 340000, realized: 208000 },
 { category: 'Devices', projected: 280000, realized: 172000 },
 { category: 'Phenotypes', projected: 170000, realized: 104000 },
 { category: '340B', projected: 60000, realized: 36000 }
 ]},
 { month: 'Feb', projected: 920000, realized: 610000, breakdown: [
 { category: 'GDMT', projected: 368000, realized: 244000 },
 { category: 'Devices', projected: 304000, realized: 201000 },
 { category: 'Phenotypes', projected: 184000, realized: 122000 },
 { category: '340B', projected: 64000, realized: 43000 }
 ]},
 { month: 'Mar', projected: 1050000, realized: 720000, breakdown: [
 { category: 'GDMT', projected: 420000, realized: 288000 },
 { category: 'Devices', projected: 350000, realized: 238000 },
 { category: 'Phenotypes', projected: 210000, realized: 144000 },
 { category: '340B', projected: 70000, realized: 50000 }
 ]},
 { month: 'Apr', projected: 980000, realized: 680000, breakdown: [
 { category: 'GDMT', projected: 392000, realized: 272000 },
 { category: 'Devices', projected: 324000, realized: 224000 },
 { category: 'Phenotypes', projected: 196000, realized: 136000 },
 { category: '340B', projected: 68000, realized: 48000 }
 ]},
 { month: 'May', projected: 1120000, realized: 810000, breakdown: [
 { category: 'GDMT', projected: 448000, realized: 324000 },
 { category: 'Devices', projected: 372000, realized: 268000 },
 { category: 'Phenotypes', projected: 224000, realized: 162000 },
 { category: '340B', projected: 76000, realized: 56000 }
 ]},
 { month: 'Jun', projected: 1200000, realized: 890000, breakdown: [
 { category: 'GDMT', projected: 480000, realized: 356000 },
 { category: 'Devices', projected: 400000, realized: 294000 },
 { category: 'Phenotypes', projected: 240000, realized: 178000 },
 { category: '340B', projected: 80000, realized: 62000 }
 ]},
 { month: 'Jul', projected: 1150000, realized: 850000, breakdown: [
 { category: 'GDMT', projected: 460000, realized: 340000 },
 { category: 'Devices', projected: 382000, realized: 281000 },
 { category: 'Phenotypes', projected: 230000, realized: 170000 },
 { category: '340B', projected: 78000, realized: 59000 }
 ]},
 { month: 'Aug', projected: 1280000, realized: 950000, breakdown: [
 { category: 'GDMT', projected: 512000, realized: 380000 },
 { category: 'Devices', projected: 426000, realized: 314000 },
 { category: 'Phenotypes', projected: 256000, realized: 190000 },
 { category: '340B', projected: 86000, realized: 66000 }
 ]},
 { month: 'Sep', projected: 1350000, realized: 980000, breakdown: [
 { category: 'GDMT', projected: 540000, realized: 392000 },
 { category: 'Devices', projected: 450000, realized: 324000 },
 { category: 'Phenotypes', projected: 270000, realized: 196000 },
 { category: '340B', projected: 90000, realized: 68000 }
 ]},
 { month: 'Oct', projected: 1400000, realized: 1050000, breakdown: [
 { category: 'GDMT', projected: 560000, realized: 420000 },
 { category: 'Devices', projected: 467000, realized: 347000 },
 { category: 'Phenotypes', projected: 280000, realized: 210000 },
 { category: '340B', projected: 93000, realized: 73000 }
 ]}
 ],
 
 // Documentation opportunities
 documentation: {
 totalRevenue: 156840,
 opportunities: [
 { priority: 'High', count: 12, description: 'Device Complication Documentation', revenue: 89200 },
 { priority: 'Medium', count: 15, description: 'Ablation Complexity Coding', revenue: 58640 },
 { priority: 'Urgent', count: 9, description: 'CRT-D Upgrade Documentation', dueThisWeek: true }
 ],
 details: [
 'Device infection/erosion requiring extraction (DRG 264)',
 'Complex ablation with esophageal temperature monitoring',
 'CRT-D upgrade with lead revision (higher RVU capture)'
 ]
 },
 
 // CMI Analysis
 cmi: {
 currentCMI: 3.42,
 targetCMI: 3.0,
 variance: 0.42,
 monthlyOpportunity: 472000,
 documentationRate: 94.7,
 avgLOS: 2.1,
 benchmarkLOS: 2.5
 }
  },
  
  // ========================================
  // STRUCTURAL HEART
  // ========================================
  structural: {
 moduleName: 'Structural Heart',
 totalPatients: 892,
 
 categoryMapping: {
 'GDMT': 'TAVR',
 'Devices': 'MitraClip/TEER',
 'Phenotypes': 'Tricuspid Repair',
 '340B': 'BAV/Other'
 },
 
 revenueCategories: [
 {
 internalName: 'GDMT',
 displayName: 'TAVR',
 revenue: 4200000,
 patientCount: 124,
 procedures: ['Transfemoral TAVR', 'Alternative Access TAVR'],
 breakdown: [
 { type: 'Transfemoral', value: 2800000 },
 { type: 'Alternative Access', value: 1400000 }
 ]
 },
 {
 internalName: 'Devices',
 displayName: 'MitraClip/TEER',
 revenue: 3100000,
 patientCount: 89,
 procedures: ['MitraClip', 'PASCAL'],
 breakdown: [
 { type: 'MitraClip', value: 2400000 },
 { type: 'TriClip', value: 700000 }
 ]
 },
 {
 internalName: 'Phenotypes',
 displayName: 'Tricuspid Repair',
 revenue: 1800000,
 patientCount: 45,
 procedures: ['TriClip'],
 breakdown: [
 { type: 'TriClip', value: 1300000 },
 { type: 'Annuloplasty', value: 500000 }
 ]
 },
 {
 internalName: '340B',
 displayName: 'BAV/Other',
 revenue: 1200000,
 patientCount: 67,
 procedures: ['Balloon Aortic Valvuloplasty'],
 breakdown: [
 { type: 'BAV', value: 700000 },
 { type: 'LAA Closure', value: 500000 }
 ]
 }
 ],
 
 facilities: [
 {
 name: 'Main Campus Medical Center - Structural Heart Lab',
 location: '1000 Medical Center Dr, Suite 100',
 totalRevenue: 4500000,
 patientCount: 412,
 gdmtRate: 88,
 captureRate: 94,
 breakdown: [
 { category: 'TAVR', value: 2600000, percentage: 58 },
 { category: 'MitraClip', value: 1400000, percentage: 31 }
 ],
 providers: [
 { name: 'Dr. Jennifer Adams', specialty: 'Structural Heart', procedures: 156 }
 ]
 },
 {
 name: 'West Campus Medical Center',
 location: '2500 West Medical Blvd, Suite 200',
 totalRevenue: 3400000,
 patientCount: 289,
 gdmtRate: 82,
 captureRate: 89,
 breakdown: [
 { category: 'TAVR', value: 1900000, percentage: 56 }
 ],
 providers: [
 { name: 'Dr. Rachel Cohen', specialty: 'Structural Heart', procedures: 98 }
 ]
 },
 {
 name: 'North Campus Hospital',
 location: '4200 North Campus Pkwy, Suite 300',
 totalRevenue: 1800000,
 patientCount: 134,
 gdmtRate: 76,
 captureRate: 81,
 breakdown: [
 { category: 'MitraClip', value: 1200000, percentage: 67 }
 ],
 providers: [
 { name: 'Dr. Alan Wong', specialty: 'Structural Heart', procedures: 67 }
 ]
 },
 {
 name: 'Community Medical Center',
 location: '5500 Community Health Blvd, Suite 400',
 totalRevenue: 620000,
 patientCount: 57,
 gdmtRate: 68,
 captureRate: 72,
 breakdown: [
 { category: 'BAV', value: 420000, percentage: 68 }
 ],
 providers: [
 { name: 'Dr. Maria Gonzalez', specialty: 'Interventional Card', procedures: 34 }
 ]
 }
 ],
 
 benchmarks: [
 {
 metric: 'TAVR 30-Day Mortality',
 value: 1.8,
 benchmark: 2.5,
 percentile: 87,
 trend: 'down',
 description: '30-day all-cause mortality post-TAVR',
 trendData: [
 { month: 'Jun', value: 2.4 },
 { month: 'Jul', value: 2.2 },
 { month: 'Aug', value: 2.1 },
 { month: 'Sep', value: 2.0 },
 { month: 'Oct', value: 1.9 },
 { month: 'Nov', value: 1.8 }
 ]
 },
 {
 metric: 'MitraClip Technical Success',
 value: 96,
 benchmark: 92,
 percentile: 83,
 trend: 'up',
 description: 'MR reduction to ≤2+ post-procedure',
 trendData: [
 { month: 'Jun', value: 93 },
 { month: 'Jul', value: 94 },
 { month: 'Aug', value: 94 },
 { month: 'Sep', value: 95 },
 { month: 'Oct', value: 95 },
 { month: 'Nov', value: 96 }
 ]
 }
 ],
 
 drgs: [
 { code: '266', name: 'TAVR w MCC', description: 'TAVR with Major Complications', category: 'TAVR', reimbursement: 54320, cases: 45, cost: 28900, margin: 46.8, netMargin: 46.8, varianceVsBenchmark: 8200, caseCount: 45, avgReimbursement: 54320, avgCost: 28900, avgLOS: 3.2, readmissionRate: 8.5 },
 { code: '267', name: 'TAVR w CC', description: 'TAVR with Complications', category: 'TAVR', reimbursement: 45680, cases: 67, cost: 24100, margin: 47.2, netMargin: 47.2, varianceVsBenchmark: 6100, caseCount: 67, avgReimbursement: 45680, avgCost: 24100, avgLOS: 2.8, readmissionRate: 6.2 },
 { code: '269', name: 'MitraClip w MCC', description: 'MitraClip with Major Complications', category: 'MitraClip/TEER', reimbursement: 42340, cases: 32, cost: 22100, margin: 47.8, netMargin: 47.8, varianceVsBenchmark: 7200, caseCount: 32, avgReimbursement: 42340, avgCost: 22100, avgLOS: 2.5, readmissionRate: 7.1 }
 ],
 
 monthlyData: [
 { month: 'Jan', projected: 920000, realized: 580000, procedures: 45, revenue: 580000, avgLOS: 2.8, readmissions: 4, complications: 2, breakdown: [
 { category: 'GDMT', projected: 400000, realized: 252000 },
 { category: 'Devices', projected: 300000, realized: 189000 }
 ]},
 { month: 'Feb', projected: 980000, realized: 640000, procedures: 52, revenue: 640000, avgLOS: 2.7, readmissions: 3, complications: 1, breakdown: [
 { category: 'GDMT', projected: 430000, realized: 281000 },
 { category: 'Devices', projected: 320000, realized: 209000 }
 ]}
 ],
 
 documentation: {
 totalRevenue: 189400,
 opportunities: [
 { priority: 'High', count: 18, description: 'Alternative Access TAVR Coding', revenue: 98200 }
 ],
 details: ['Alternative access TAVR codes']
 },
 
 cmi: {
 currentCMI: 3.78,
 targetCMI: 3.4,
 variance: 0.38,
 monthlyOpportunity: 524000,
 documentationRate: 96.2,
 avgLOS: 2.8,
 benchmarkLOS: 3.2
 }
  },
  
  // ========================================
  // CORONARY INTERVENTION  
  // ========================================
  coronary: {
 facilities: [
 {
 id: 'msmc-coronary',
 name: 'Main Campus Medical Center',
 address: '1000 Medical Center Dr, Suite 100',
 totalProcedures: 1456,
 avgRiskScore: 5.8,
 complicationRate: 1.2,
 avgLOS: 2.1,
 readmissionRate: 6.3,
 mortalityRate: 0.4,
 patientSatisfaction: 95.2,
 qualityScore: 96.1
 },
 {
 id: 'mswh-coronary',
 name: 'West Campus Medical Center',
 address: '2500 West Medical Blvd, Suite 200',
 totalProcedures: 1123,
 avgRiskScore: 5.4,
 complicationRate: 0.9,
 avgLOS: 1.9,
 readmissionRate: 5.8,
 mortalityRate: 0.3,
 patientSatisfaction: 96.1,
 qualityScore: 97.2
 },
 {
 id: 'msbi-coronary',
 name: 'East Campus Hospital',
 address: '3100 East Campus Way, Suite 150',
 totalProcedures: 987,
 avgRiskScore: 5.6,
 complicationRate: 1.1,
 avgLOS: 2.0,
 readmissionRate: 6.1,
 mortalityRate: 0.3,
 patientSatisfaction: 94.8,
 qualityScore: 95.7
 },
 {
 id: 'mssl-coronary',
 name: 'North Campus Hospital',
 address: '4200 North Campus Pkwy, Suite 300',
 totalProcedures: 678,
 avgRiskScore: 5.2,
 complicationRate: 0.8,
 avgLOS: 1.8,
 readmissionRate: 5.4,
 mortalityRate: 0.2,
 patientSatisfaction: 96.8,
 qualityScore: 97.9
 }
 ],

 benchmarks: {
 national: {
 avgRiskScore: 6.2,
 complicationRate: 1.8,
 avgLOS: 2.4,
 readmissionRate: 7.9,
 mortalityRate: 0.7,
 patientSatisfaction: 91.4,
 qualityScore: 89.8,
 costPerCase: 18950,
 timeToTreatment: 52.3
 },
 regional: {
 avgRiskScore: 5.9,
 complicationRate: 1.5,
 avgLOS: 2.2,
 readmissionRate: 7.1,
 mortalityRate: 0.5,
 patientSatisfaction: 93.2,
 qualityScore: 92.1,
 costPerCase: 19750,
 timeToTreatment: 48.6
 },
 institutional: {
 avgRiskScore: 5.5,
 complicationRate: 1.0,
 avgLOS: 1.9,
 readmissionRate: 5.9,
 mortalityRate: 0.3,
 patientSatisfaction: 95.7,
 qualityScore: 96.7,
 costPerCase: 17890,
 timeToTreatment: 42.1
 }
 },

 drgData: [
 {
 code: 'DRG 246',
 description: 'Percutaneous Cardiovascular Proc w Drug-Eluting Stent w MCC',
 caseCount: 567,
 avgReimbursement: 34890,
 avgCost: 28540,
 netMargin: 6350,
 avgLOS: 3.4,
 readmissionRate: 6.7
 },
 {
 code: 'DRG 247',
 description: 'Percutaneous Cardiovascular Proc w Drug-Eluting Stent w/o MCC',
 caseCount: 1234,
 avgReimbursement: 28760,
 avgCost: 23190,
 netMargin: 5570,
 avgLOS: 2.1,
 readmissionRate: 4.3
 },
 {
 code: 'DRG 248',
 description: 'Percutaneous Cardiovascular Proc w Non-Drug-Eluting Stent w MCC',
 caseCount: 234,
 avgReimbursement: 31240,
 avgCost: 25680,
 netMargin: 5560,
 avgLOS: 2.8,
 readmissionRate: 5.9
 },
 {
 code: 'DRG 249',
 description: 'Percutaneous Cardiovascular Proc w Non-Drug-Eluting Stent w/o MCC',
 caseCount: 567,
 avgReimbursement: 25890,
 avgCost: 21340,
 netMargin: 4550,
 avgLOS: 1.9,
 readmissionRate: 3.8
 },
 {
 code: 'DRG 250',
 description: 'Percutaneous Cardiovascular Proc w/o Coronary Artery Stent w MCC',
 caseCount: 189,
 avgReimbursement: 22340,
 avgCost: 18790,
 netMargin: 3550,
 avgLOS: 2.3,
 readmissionRate: 4.7
 },
 {
 code: 'DRG 251',
 description: 'Percutaneous Cardiovascular Proc w/o Coronary Artery Stent w/o MCC',
 caseCount: 345,
 avgReimbursement: 18950,
 avgCost: 15670,
 netMargin: 3280,
 avgLOS: 1.6,
 readmissionRate: 3.1
 },
 {
 code: 'DRG 280',
 description: 'Acute Myocardial Infarction, Discharged Alive w MCC',
 caseCount: 267,
 avgReimbursement: 15680,
 avgCost: 12940,
 netMargin: 2740,
 avgLOS: 4.2,
 readmissionRate: 8.9
 },
 {
 code: 'DRG 281',
 description: 'Acute Myocardial Infarction, Discharged Alive w CC',
 caseCount: 423,
 avgReimbursement: 12340,
 avgCost: 10290,
 netMargin: 2050,
 avgLOS: 3.1,
 readmissionRate: 6.4
 }
 ],

 monthlyData: [
 { month: 'Jan 2024', procedures: 367, revenue: 8950000, avgLOS: 1.9, readmissions: 22, complications: 4 },
 { month: 'Feb 2024', procedures: 334, revenue: 8123000, avgLOS: 1.8, readmissions: 19, complications: 3 },
 { month: 'Mar 2024', procedures: 412, revenue: 9890000, avgLOS: 2.0, readmissions: 25, complications: 5 },
 { month: 'Apr 2024', procedures: 389, revenue: 9234000, avgLOS: 1.9, readmissions: 23, complications: 4 },
 { month: 'May 2024', procedures: 445, revenue: 10567000, avgLOS: 2.1, readmissions: 27, complications: 5 },
 { month: 'Jun 2024', procedures: 456, revenue: 10890000, avgLOS: 2.0, readmissions: 28, complications: 6 },
 { month: 'Jul 2024', procedures: 378, revenue: 9123000, avgLOS: 1.9, readmissions: 22, complications: 3 },
 { month: 'Aug 2024', procedures: 467, revenue: 11234000, avgLOS: 2.1, readmissions: 29, complications: 6 },
 { month: 'Sep 2024', procedures: 398, revenue: 9567000, avgLOS: 2.0, readmissions: 24, complications: 4 },
 { month: 'Oct 2024', procedures: 423, revenue: 10123000, avgLOS: 2.0, readmissions: 26, complications: 5 },
 { month: 'Nov 2024', procedures: 356, revenue: 8567000, avgLOS: 1.8, readmissions: 21, complications: 3 },
 { month: 'Dec 2024', procedures: 419, revenue: 10067000, avgLOS: 2.0, readmissions: 25, complications: 4 }
 ],

 documentationOpportunities: [
 {
 facilityId: 'msmc-coronary',
 opportunities: [
 { category: 'Lesion Classification', count: 34, impact: 'High', description: 'AHA/ACC lesion type documentation' },
 { category: 'SYNTAX Score', count: 28, impact: 'Medium', description: 'Complexity scoring documentation' },
 { category: 'FFR/iFR', count: 22, impact: 'High', description: 'Functional assessment documentation' },
 { category: 'Complications', count: 12, impact: 'Critical', description: 'Procedural complication coding' }
 ]
 },
 {
 facilityId: 'mswh-coronary',
 opportunities: [
 { category: 'Lesion Classification', count: 29, impact: 'High', description: 'Vessel segment documentation' },
 { category: 'Device Utilization', count: 21, impact: 'Medium', description: 'Stent specifications and sizing' },
 { category: 'Medications', count: 18, impact: 'Medium', description: 'Antiplatelet therapy documentation' },
 { category: 'Outcomes', count: 9, impact: 'Low', description: 'Post-procedural TIMI flow' }
 ]
 },
 {
 facilityId: 'msbi-coronary',
 opportunities: [
 { category: 'Risk Assessment', count: 26, impact: 'High', description: 'GRACE score documentation' },
 { category: 'Lesion Classification', count: 23, impact: 'High', description: 'Calcification grading' },
 { category: 'Access Site', count: 15, impact: 'Medium', description: 'Radial vs femoral access' },
 { category: 'Contrast Volume', count: 11, impact: 'Low', description: 'Contrast nephropathy prevention' }
 ]
 },
 {
 facilityId: 'mssl-coronary',
 opportunities: [
 { category: 'Imaging Guidance', count: 19, impact: 'Medium', description: 'IVUS/OCT utilization' },
 { category: 'Lesion Classification', count: 17, impact: 'High', description: 'Bifurcation lesion classification' },
 { category: 'Quality Metrics', count: 13, impact: 'Medium', description: 'Door-to-balloon time documentation' },
 { category: 'Follow-up', count: 8, impact: 'Low', description: 'Dual antiplatelet therapy duration' }
 ]
 }
 ]
  },
  
  // ========================================
  // VALVULAR DISEASE
  // ========================================
  valvular: {
 facilities: [
 {
 id: 'msmc-valvular',
 name: 'Main Campus Medical Center',
 address: '1000 Medical Center Dr, Suite 100',
 totalProcedures: 623,
 avgRiskScore: 8.1,
 complicationRate: 3.2,
 avgLOS: 4.8,
 readmissionRate: 11.2,
 mortalityRate: 1.8,
 patientSatisfaction: 93.4,
 qualityScore: 91.7
 },
 {
 id: 'mswh-valvular',
 name: 'West Campus Medical Center',
 address: '2500 West Medical Blvd, Suite 200',
 totalProcedures: 445,
 avgRiskScore: 7.8,
 complicationRate: 2.9,
 avgLOS: 4.5,
 readmissionRate: 10.1,
 mortalityRate: 1.5,
 patientSatisfaction: 94.2,
 qualityScore: 92.9
 },
 {
 id: 'msbi-valvular',
 name: 'East Campus Hospital',
 address: '3100 East Campus Way, Suite 150',
 totalProcedures: 312,
 avgRiskScore: 7.5,
 complicationRate: 2.7,
 avgLOS: 4.2,
 readmissionRate: 9.6,
 mortalityRate: 1.3,
 patientSatisfaction: 93.8,
 qualityScore: 93.5
 },
 {
 id: 'mssl-valvular',
 name: 'North Campus Hospital',
 address: '4200 North Campus Pkwy, Suite 300',
 totalProcedures: 198,
 avgRiskScore: 7.2,
 complicationRate: 2.4,
 avgLOS: 3.9,
 readmissionRate: 8.8,
 mortalityRate: 1.1,
 patientSatisfaction: 95.1,
 qualityScore: 94.8
 }
 ],

 benchmarks: {
 national: {
 avgRiskScore: 8.5,
 complicationRate: 4.1,
 avgLOS: 5.2,
 readmissionRate: 13.7,
 mortalityRate: 2.4,
 patientSatisfaction: 87.9,
 qualityScore: 85.2,
 costPerCase: 52890,
 timeToTreatment: 21.4
 },
 regional: {
 avgRiskScore: 8.2,
 complicationRate: 3.7,
 avgLOS: 4.9,
 readmissionRate: 12.8,
 mortalityRate: 2.1,
 patientSatisfaction: 90.1,
 qualityScore: 87.8,
 costPerCase: 54200,
 timeToTreatment: 19.8
 },
 institutional: {
 avgRiskScore: 7.6,
 complicationRate: 2.8,
 avgLOS: 4.4,
 readmissionRate: 9.9,
 mortalityRate: 1.4,
 patientSatisfaction: 94.1,
 qualityScore: 93.2,
 costPerCase: 48950,
 timeToTreatment: 17.1
 }
 },

 drgData: [
 {
 code: 'DRG 104',
 description: 'Cardiac Valve & Oth Maj Cardiothoracic Proc w Cardiac Cath w MCC',
 caseCount: 156,
 avgReimbursement: 125670,
 avgCost: 98450,
 netMargin: 27220,
 avgLOS: 12.4,
 readmissionRate: 18.9
 },
 {
 code: 'DRG 105',
 description: 'Cardiac Valve & Oth Maj Cardiothoracic Proc w Cardiac Cath w CC',
 caseCount: 234,
 avgReimbursement: 89340,
 avgCost: 71230,
 netMargin: 18110,
 avgLOS: 8.7,
 readmissionRate: 14.2
 },
 {
 code: 'DRG 106',
 description: 'Cardiac Valve & Oth Maj Cardiothoracic Proc w Cardiac Cath w/o CC/MCC',
 caseCount: 298,
 avgReimbursement: 67890,
 avgCost: 54670,
 netMargin: 13220,
 avgLOS: 6.1,
 readmissionRate: 9.8
 },
 {
 code: 'DRG 107',
 description: 'Cardiac Valve & Oth Maj Cardiothoracic Proc w/o Cardiac Cath w MCC',
 caseCount: 123,
 avgReimbursement: 112340,
 avgCost: 89670,
 netMargin: 22670,
 avgLOS: 10.8,
 readmissionRate: 16.7
 },
 {
 code: 'DRG 108',
 description: 'Cardiac Valve & Oth Maj Cardiothoracic Proc w/o Cardiac Cath w CC',
 caseCount: 189,
 avgReimbursement: 78950,
 avgCost: 63440,
 netMargin: 15510,
 avgLOS: 7.3,
 readmissionRate: 12.1
 },
 {
 code: 'DRG 216',
 description: 'Cardiac Valve & Oth Maj Cardiothoracic Proc w Cardiac Cath w MCC',
 caseCount: 167,
 avgReimbursement: 98760,
 avgCost: 78900,
 netMargin: 19860,
 avgLOS: 9.4,
 readmissionRate: 15.3
 },
 {
 code: 'DRG 267',
 description: 'Aortic and Heart Assist Procedures Except Pulsation Balloon w MCC',
 caseCount: 89,
 avgReimbursement: 156780,
 avgCost: 124560,
 netMargin: 32220,
 avgLOS: 16.2,
 readmissionRate: 22.4
 },
 {
 code: 'DRG 268',
 description: 'Aortic and Heart Assist Procedures Except Pulsation Balloon w/o MCC',
 caseCount: 122,
 avgReimbursement: 98450,
 avgCost: 78320,
 netMargin: 20130,
 avgLOS: 10.7,
 readmissionRate: 16.8
 }
 ],

 monthlyData: [
 { month: 'Jan 2024', procedures: 134, revenue: 9890000, avgLOS: 4.3, readmissions: 13, complications: 4 },
 { month: 'Feb 2024', procedures: 119, revenue: 8765000, avgLOS: 4.2, readmissions: 12, complications: 3 },
 { month: 'Mar 2024', procedures: 156, revenue: 11234000, avgLOS: 4.6, readmissions: 16, complications: 5 },
 { month: 'Apr 2024', procedures: 142, revenue: 10456000, avgLOS: 4.4, readmissions: 14, complications: 4 },
 { month: 'May 2024', procedures: 167, revenue: 12123000, avgLOS: 4.7, readmissions: 17, complications: 6 },
 { month: 'Jun 2024', procedures: 178, revenue: 12890000, avgLOS: 4.5, readmissions: 18, complications: 6 },
 { month: 'Jul 2024', procedures: 145, revenue: 10567000, avgLOS: 4.3, readmissions: 15, complications: 4 },
 { month: 'Aug 2024', procedures: 189, revenue: 13456000, avgLOS: 4.8, readmissions: 19, complications: 7 },
 { month: 'Sep 2024', procedures: 159, revenue: 11567000, avgLOS: 4.4, readmissions: 16, complications: 5 },
 { month: 'Oct 2024', procedures: 172, revenue: 12234000, avgLOS: 4.6, readmissions: 17, complications: 6 },
 { month: 'Nov 2024', procedures: 138, revenue: 9890000, avgLOS: 4.2, readmissions: 14, complications: 4 },
 { month: 'Dec 2024', procedures: 163, revenue: 11789000, avgLOS: 4.5, readmissions: 16, complications: 5 }
 ],

 documentationOpportunities: [
 {
 facilityId: 'msmc-valvular',
 opportunities: [
 { category: 'Valve Morphology', count: 28, impact: 'High', description: 'Detailed valve anatomy documentation' },
 { category: 'Hemodynamic Assessment', count: 22, impact: 'High', description: 'Gradient and valve area measurements' },
 { category: 'Risk Stratification', count: 19, impact: 'Medium', description: 'STS risk score documentation' },
 { category: 'Complications', count: 11, impact: 'Critical', description: 'Periprocedural complication coding' }
 ]
 },
 {
 facilityId: 'mswh-valvular',
 opportunities: [
 { category: 'Echo Assessment', count: 21, impact: 'High', description: 'Comprehensive echo findings' },
 { category: 'Functional Status', count: 17, impact: 'Medium', description: 'NYHA class documentation' },
 { category: 'Device Specifications', count: 14, impact: 'Medium', description: 'Prosthetic valve details' },
 { category: 'Anticoagulation', count: 8, impact: 'Low', description: 'Warfarin management' }
 ]
 },
 {
 facilityId: 'msbi-valvular',
 opportunities: [
 { category: 'Severity Assessment', count: 18, impact: 'High', description: 'Valve disease severity grading' },
 { category: 'Surgical Risk', count: 15, impact: 'Medium', description: 'EuroSCORE documentation' },
 { category: 'Access Route', count: 12, impact: 'Medium', description: 'Surgical approach documentation' },
 { category: 'Follow-up', count: 7, impact: 'Low', description: 'Post-operative monitoring' }
 ]
 },
 {
 facilityId: 'mssl-valvular',
 opportunities: [
 { category: 'Imaging Quality', count: 14, impact: 'Medium', description: 'TEE image optimization' },
 { category: 'Valve Assessment', count: 12, impact: 'High', description: 'Quantitative valve assessment' },
 { category: 'Outcomes', count: 9, impact: 'Medium', description: 'Functional improvement metrics' },
 { category: 'Quality Metrics', count: 6, impact: 'Low', description: 'Performance indicator tracking' }
 ]
 }
 ]
  },
  
  // ========================================
  // PERIPHERAL VASCULAR
  // ========================================
  peripheral: {
 facilities: [
 {
 id: 'msmc-peripheral',
 name: 'Main Campus Medical Center',
 address: '1000 Medical Center Dr, Suite 100',
 totalProcedures: 743,
 avgRiskScore: 6.4,
 complicationRate: 2.1,
 avgLOS: 2.8,
 readmissionRate: 7.9,
 mortalityRate: 0.6,
 patientSatisfaction: 94.6,
 qualityScore: 95.3
 },
 {
 id: 'mswh-peripheral',
 name: 'West Campus Medical Center',
 address: '2500 West Medical Blvd, Suite 200',
 totalProcedures: 567,
 avgRiskScore: 6.1,
 complicationRate: 1.8,
 avgLOS: 2.5,
 readmissionRate: 7.2,
 mortalityRate: 0.4,
 patientSatisfaction: 95.4,
 qualityScore: 96.1
 },
 {
 id: 'msbi-peripheral',
 name: 'East Campus Hospital',
 address: '3100 East Campus Way, Suite 150',
 totalProcedures: 423,
 avgRiskScore: 5.9,
 complicationRate: 1.6,
 avgLOS: 2.3,
 readmissionRate: 6.8,
 mortalityRate: 0.3,
 patientSatisfaction: 94.9,
 qualityScore: 95.8
 },
 {
 id: 'mssl-peripheral',
 name: 'North Campus Hospital',
 address: '4200 North Campus Pkwy, Suite 300',
 totalProcedures: 289,
 avgRiskScore: 5.6,
 complicationRate: 1.3,
 avgLOS: 2.1,
 readmissionRate: 6.1,
 mortalityRate: 0.2,
 patientSatisfaction: 96.2,
 qualityScore: 97.1
 }
 ],

 benchmarks: {
 national: {
 avgRiskScore: 6.8,
 complicationRate: 2.9,
 avgLOS: 3.2,
 readmissionRate: 9.4,
 mortalityRate: 0.9,
 patientSatisfaction: 90.7,
 qualityScore: 88.9,
 costPerCase: 14750,
 timeToTreatment: 18.7
 },
 regional: {
 avgRiskScore: 6.5,
 complicationRate: 2.5,
 avgLOS: 2.9,
 readmissionRate: 8.6,
 mortalityRate: 0.7,
 patientSatisfaction: 92.8,
 qualityScore: 91.4,
 costPerCase: 15200,
 timeToTreatment: 16.9
 },
 institutional: {
 avgRiskScore: 6.0,
 complicationRate: 1.7,
 avgLOS: 2.4,
 readmissionRate: 7.0,
 mortalityRate: 0.4,
 patientSatisfaction: 95.3,
 qualityScore: 96.1,
 costPerCase: 13890,
 timeToTreatment: 14.2
 }
 },

 drgData: [
 {
 code: 'DRG 252',
 description: 'Other Vascular Procedures w MCC',
 caseCount: 234,
 avgReimbursement: 28950,
 avgCost: 23780,
 netMargin: 5170,
 avgLOS: 4.8,
 readmissionRate: 11.2
 },
 {
 code: 'DRG 253',
 description: 'Other Vascular Procedures w CC',
 caseCount: 345,
 avgReimbursement: 21340,
 avgCost: 17690,
 netMargin: 3650,
 avgLOS: 3.2,
 readmissionRate: 8.4
 },
 {
 code: 'DRG 254',
 description: 'Other Vascular Procedures w/o CC/MCC',
 caseCount: 456,
 avgReimbursement: 16780,
 avgCost: 14230,
 netMargin: 2550,
 avgLOS: 2.1,
 readmissionRate: 5.9
 },
 {
 code: 'DRG 299',
 description: 'Peripheral Vascular Disorders w MCC',
 caseCount: 189,
 avgReimbursement: 12450,
 avgCost: 10890,
 netMargin: 1560,
 avgLOS: 3.8,
 readmissionRate: 9.7
 },
 {
 code: 'DRG 300',
 description: 'Peripheral Vascular Disorders w CC',
 caseCount: 267,
 avgReimbursement: 9850,
 avgCost: 8670,
 netMargin: 1180,
 avgLOS: 2.9,
 readmissionRate: 7.3
 },
 {
 code: 'DRG 301',
 description: 'Peripheral Vascular Disorders w/o CC/MCC',
 caseCount: 378,
 avgReimbursement: 7890,
 avgCost: 6940,
 netMargin: 950,
 avgLOS: 1.8,
 readmissionRate: 4.6
 },
 {
 code: 'DRG 263',
 description: 'Vein Ligation & Stripping',
 caseCount: 156,
 avgReimbursement: 8450,
 avgCost: 7120,
 netMargin: 1330,
 avgLOS: 1.2,
 readmissionRate: 2.8
 },
 {
 code: 'DRG 264',
 description: 'Other Circulatory System Procedures',
 caseCount: 198,
 avgReimbursement: 15670,
 avgCost: 13240,
 netMargin: 2430,
 avgLOS: 2.6,
 readmissionRate: 6.4
 }
 ],

 monthlyData: [
 { month: 'Jan 2024', procedures: 167, revenue: 2890000, avgLOS: 2.4, readmissions: 13, complications: 3 },
 { month: 'Feb 2024', procedures: 145, revenue: 2567000, avgLOS: 2.3, readmissions: 11, complications: 2 },
 { month: 'Mar 2024', procedures: 189, revenue: 3234000, avgLOS: 2.6, readmissions: 15, complications: 4 },
 { month: 'Apr 2024', procedures: 172, revenue: 2945000, avgLOS: 2.4, readmissions: 13, complications: 3 },
 { month: 'May 2024', procedures: 198, revenue: 3456000, avgLOS: 2.7, readmissions: 16, complications: 4 },
 { month: 'Jun 2024', procedures: 212, revenue: 3670000, avgLOS: 2.5, readmissions: 17, complications: 5 },
 { month: 'Jul 2024', procedures: 178, revenue: 3089000, avgLOS: 2.4, readmissions: 14, complications: 3 },
 { month: 'Aug 2024', procedures: 223, revenue: 3890000, avgLOS: 2.8, readmissions: 18, complications: 5 },
 { month: 'Sep 2024', procedures: 189, revenue: 3234000, avgLOS: 2.5, readmissions: 15, complications: 4 },
 { month: 'Oct 2024', procedures: 205, revenue: 3567000, avgLOS: 2.6, readmissions: 16, complications: 4 },
 { month: 'Nov 2024', procedures: 156, revenue: 2789000, avgLOS: 2.3, readmissions: 12, complications: 2 },
 { month: 'Dec 2024', procedures: 188, revenue: 3234000, avgLOS: 2.5, readmissions: 15, complications: 4 }
 ],

 documentationOpportunities: [
 {
 facilityId: 'msmc-peripheral',
 opportunities: [
 { category: 'Lesion Assessment', count: 31, impact: 'High', description: 'TASC classification documentation' },
 { category: 'Runoff Assessment', count: 24, impact: 'Medium', description: 'Distal vessel evaluation' },
 { category: 'Functional Status', count: 19, impact: 'Medium', description: 'Claudication distance documentation' },
 { category: 'Complications', count: 9, impact: 'Critical', description: 'Access site complication coding' }
 ]
 },
 {
 facilityId: 'mswh-peripheral',
 opportunities: [
 { category: 'Device Utilization', count: 22, impact: 'Medium', description: 'Balloon and stent specifications' },
 { category: 'Hemodynamic Assessment', count: 18, impact: 'High', description: 'ABI and pressure measurements' },
 { category: 'Medications', count: 15, impact: 'Medium', description: 'Antiplatelet therapy documentation' },
 { category: 'Follow-up', count: 7, impact: 'Low', description: 'Surveillance imaging' }
 ]
 },
 {
 facilityId: 'msbi-peripheral',
 opportunities: [
 { category: 'Risk Factors', count: 19, impact: 'High', description: 'Diabetes and smoking status' },
 { category: 'Vessel Assessment', count: 16, impact: 'High', description: 'Calcification grading' },
 { category: 'Access Site', count: 11, impact: 'Medium', description: 'Retrograde vs antegrade approach' },
 { category: 'Quality Metrics', count: 6, impact: 'Low', description: 'Technical success rates' }
 ]
 },
 {
 facilityId: 'mssl-peripheral',
 opportunities: [
 { category: 'Imaging Quality', count: 14, impact: 'Medium', description: 'Angiographic documentation' },
 { category: 'Wound Assessment', count: 12, impact: 'High', description: 'Wagner grade classification' },
 { category: 'Outcomes', count: 9, impact: 'Medium', description: 'Limb salvage assessment' },
 { category: 'Rehabilitation', count: 5, impact: 'Low', description: 'Physical therapy referrals' }
 ]
 }
 ]
  }
};