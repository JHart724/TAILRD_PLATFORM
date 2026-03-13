// Clinical Data Configuration for All Cardiovascular Modules
// Comprehensive clinical, financial, and operational data for the TAILRD Platform

interface Procedure {
  name: string;
  cptCode: string;
  reimbursement: number;
  averageCost: number;
  margin: number;
  volume?: number;
}

interface QualityMetric {
  name: string;
  target: number;
  unit: string;
  currentValue?: number;
}

interface ClinicalCondition {
  name: string;
  prevalenceRate: number;
  detectionCriteria: string[];
  riskFactors?: string[];
}

interface TherapeuticIntervention {
  name: string;
  clinicalIndication: string;
  annualCost: number;
  efficacyRate?: number;
}

interface ModuleClinicalData {
  keyProcedures: Procedure[];
  qualityMetrics: QualityMetric[];
  clinicalConditions: ClinicalCondition[];
  therapeuticInterventions: TherapeuticIntervention[];
}

// ====================
// ELECTROPHYSIOLOGY MODULE
// ====================
const electrophysiologyData: ModuleClinicalData = {
  keyProcedures: [
 {
 name: "Permanent Pacemaker Implantation",
 cptCode: "33206-33208",
 reimbursement: 89760,
 averageCost: 42500,
 margin: 52.6,
 volume: 245
 },
 {
 name: "ICD Implantation (Single Chamber)",
 cptCode: "33249",
 reimbursement: 127340,
 averageCost: 68200,
 margin: 46.4,
 volume: 124
 },
 {
 name: "CRT-D Implantation",
 cptCode: "33224/33225",
 reimbursement: 189420,
 averageCost: 95600,
 margin: 49.5,
 volume: 87
 },
 {
 name: "Atrial Fibrillation Ablation",
 cptCode: "93656",
 reimbursement: 78950,
 averageCost: 35400,
 margin: 55.2,
 volume: 312
 },
 {
 name: "VT Ablation",
 cptCode: "93654",
 reimbursement: 142680,
 averageCost: 67800,
 margin: 52.5,
 volume: 68
 },
 {
 name: "LAAC Device Implantation (Watchman)",
 cptCode: "33340",
 reimbursement: 67420,
 averageCost: 28900,
 margin: 57.1,
 volume: 156
 },
 {
 name: "Lead Extraction/Revision",
 cptCode: "33234-33244",
 reimbursement: 98540,
 averageCost: 52300,
 margin: 46.9,
 volume: 94
 },
 {
 name: "EP Study with Ablation",
 cptCode: "93653",
 reimbursement: 56780,
 averageCost: 24600,
 margin: 56.7,
 volume: 198
 }
  ],

  qualityMetrics: [
 {
 name: "AF Ablation Success Rate (Single Procedure)",
 target: 75,
 unit: "%",
 currentValue: 82
 },
 {
 name: "Device Infection Rate",
 target: 1.5,
 unit: "%",
 currentValue: 0.8
 },
 {
 name: "Appropriate ICD Therapy Rate",
 target: 85,
 unit: "%",
 currentValue: 91
 },
 {
 name: "Lead Complication Rate",
 target: 2.0,
 unit: "%",
 currentValue: 1.2
 },
 {
 name: "Anticoagulation Compliance (AF Patients)",
 target: 90,
 unit: "%",
 currentValue: 87
 },
 {
 name: "30-Day Readmission Rate",
 target: 8,
 unit: "%",
 currentValue: 6.4
 }
  ],

  clinicalConditions: [
 {
 name: "Atrial Fibrillation with High Stroke Risk",
 prevalenceRate: 15.2,
 detectionCriteria: [
 "CHA2DS2-VASc Score \u22652",
 "Documented AF on ECG or monitoring",
 "Anticoagulation indicated but contraindicated"
 ],
 riskFactors: ["Age >75", "Heart failure", "Stroke history", "Diabetes"]
 },
 {
 name: "High-Degree AV Block",
 prevalenceRate: 8.4,
 detectionCriteria: [
 "Complete heart block on ECG",
 "Mobitz Type II second-degree AV block",
 "Symptomatic bradycardia"
 ],
 riskFactors: ["Age >70", "Ischemic heart disease", "Infiltrative disease"]
 },
 {
 name: "Ventricular Tachycardia/Sudden Death Risk",
 prevalenceRate: 5.8,
 detectionCriteria: [
 "Ejection fraction \u226435%",
 "Prior sustained VT/VF",
 "High-risk cardiomyopathy"
 ],
 riskFactors: ["Ischemic cardiomyopathy", "Family history SCD", "Syncope"]
 },
 {
 name: "Drug-Refractory Atrial Fibrillation",
 prevalenceRate: 12.6,
 detectionCriteria: [
 "Failed \u22652 antiarrhythmic drugs",
 "Symptomatic AF despite rate control",
 "Quality of life impairment"
 ],
 riskFactors: ["Persistent AF", "Left atrial enlargement", "Sleep apnea"]
 }
  ],

  therapeuticInterventions: [
 {
 name: "Novel Oral Anticoagulants (NOACs)",
 clinicalIndication: "Stroke prevention in non-valvular atrial fibrillation",
 annualCost: 4200,
 efficacyRate: 87
 },
 {
 name: "Antiarrhythmic Drug Therapy",
 clinicalIndication: "Rhythm control in atrial fibrillation and ventricular arrhythmias",
 annualCost: 2800,
 efficacyRate: 62
 },
 {
 name: "Remote Device Monitoring",
 clinicalIndication: "Early detection of device issues and arrhythmias",
 annualCost: 1200,
 efficacyRate: 94
 },
 {
 name: "Cardiac Rehabilitation (Post-Device)",
 clinicalIndication: "Optimization of exercise capacity and device acceptance",
 annualCost: 3600,
 efficacyRate: 78
 }
  ]
};

// ====================
// HEART FAILURE MODULE
// ====================
const heartFailureData: ModuleClinicalData = {
  keyProcedures: [
 {
 name: "LVAD Implantation",
 cptCode: "33975",
 reimbursement: 285000,
 averageCost: 142000,
 margin: 50.2,
 volume: 34
 },
 {
 name: "Heart Transplant Evaluation",
 cptCode: "99245",
 reimbursement: 4200,
 averageCost: 1800,
 margin: 57.1,
 volume: 89
 },
 {
 name: "Right Heart Catheterization",
 cptCode: "93451",
 reimbursement: 12400,
 averageCost: 4200,
 margin: 66.1,
 volume: 456
 },
 {
 name: "Cardiac Resynchronization Therapy",
 cptCode: "33225",
 reimbursement: 189420,
 averageCost: 95600,
 margin: 49.5,
 volume: 112
 },
 {
 name: "Endomyocardial Biopsy",
 cptCode: "93505",
 reimbursement: 8750,
 averageCost: 3400,
 margin: 61.1,
 volume: 67
 },
 {
 name: "IV Inotrope Infusion",
 cptCode: "96365",
 reimbursement: 2450,
 averageCost: 890,
 margin: 63.7,
 volume: 234
 },
 {
 name: "CardioMEMS Implant",
 cptCode: "33289",
 reimbursement: 45600,
 averageCost: 22400,
 margin: 50.9,
 volume: 78
 },
 {
 name: "Ultrafiltration",
 cptCode: "90999",
 reimbursement: 6800,
 averageCost: 3200,
 margin: 52.9,
 volume: 45
 }
  ],

  qualityMetrics: [
 {
 name: "30-Day HF Readmission Rate",
 target: 20,
 unit: "%",
 currentValue: 17.8
 },
 {
 name: "GDMT Optimization Rate",
 target: 80,
 unit: "%",
 currentValue: 72
 },
 {
 name: "LVEF Documentation Rate",
 target: 95,
 unit: "%",
 currentValue: 91
 },
 {
 name: "BNP/NT-proBNP Monitoring",
 target: 90,
 unit: "%",
 currentValue: 86
 },
 {
 name: "Discharge Instructions Compliance",
 target: 95,
 unit: "%",
 currentValue: 93
 },
 {
 name: "ACEi/ARB/ARNI at Discharge",
 target: 85,
 unit: "%",
 currentValue: 79
 }
  ],

  clinicalConditions: [
 {
 name: "HFrEF (LVEF \u226440%)",
 prevalenceRate: 42.5,
 detectionCriteria: [
 "LVEF \u226440%",
 "BNP >400",
 "NYHA II-IV symptoms"
 ],
 riskFactors: ["CAD", "HTN", "DM", "Prior MI"]
 },
 {
 name: "HFpEF (LVEF \u226550%)",
 prevalenceRate: 35.2,
 detectionCriteria: [
 "LVEF \u226550%",
 "Elevated filling pressures",
 "Exercise intolerance"
 ],
 riskFactors: ["Age >65", "Obesity", "AF", "HTN"]
 },
 {
 name: "HFmrEF (LVEF 41-49%)",
 prevalenceRate: 15.8,
 detectionCriteria: [
 "LVEF 41-49%",
 "Elevated natriuretic peptides",
 "Structural heart disease"
 ],
 riskFactors: ["Transition from HFrEF", "Ischemic etiology"]
 },
 {
 name: "Cardiogenic Shock",
 prevalenceRate: 6.5,
 detectionCriteria: [
 "SBP <90",
 "CI <2.2",
 "Elevated lactate",
 "Organ hypoperfusion"
 ],
 riskFactors: ["Acute MI", "Decompensated HF", "Post-cardiotomy"]
 }
  ],

  therapeuticInterventions: [
 {
 name: "Sacubitril/Valsartan (Entresto)",
 clinicalIndication: "HFrEF LVEF \u226440%, NYHA II-IV",
 annualCost: 6800,
 efficacyRate: 82
 },
 {
 name: "SGLT2 Inhibitors",
 clinicalIndication: "HFrEF and HFpEF regardless of diabetes status",
 annualCost: 5400,
 efficacyRate: 78
 },
 {
 name: "IV Diuretic Therapy",
 clinicalIndication: "Acute decompensated HF with congestion",
 annualCost: 3200,
 efficacyRate: 91
 },
 {
 name: "Cardiac Rehabilitation",
 clinicalIndication: "Stable HF post-hospitalization",
 annualCost: 4800,
 efficacyRate: 74
 }
  ]
};

// ====================
// STRUCTURAL HEART MODULE
// ====================
const structuralHeartData: ModuleClinicalData = {
  keyProcedures: [
 {
 name: "TAVR",
 cptCode: "33361/33362",
 reimbursement: 168500,
 averageCost: 82400,
 margin: 51.1,
 volume: 186
 },
 {
 name: "MitraClip/TEER",
 cptCode: "33418",
 reimbursement: 142800,
 averageCost: 71200,
 margin: 50.1,
 volume: 94
 },
 {
 name: "TAVR Valve-in-Valve",
 cptCode: "33361",
 reimbursement: 172300,
 averageCost: 88500,
 margin: 48.6,
 volume: 28
 },
 {
 name: "Paravalvular Leak Closure",
 cptCode: "93580",
 reimbursement: 56400,
 averageCost: 24800,
 margin: 56.0,
 volume: 32
 },
 {
 name: "Balloon Aortic Valvuloplasty",
 cptCode: "92986",
 reimbursement: 28600,
 averageCost: 12400,
 margin: 56.6,
 volume: 45
 },
 {
 name: "Surgical AVR",
 cptCode: "33405",
 reimbursement: 198400,
 averageCost: 102600,
 margin: 48.3,
 volume: 124
 },
 {
 name: "Surgical MVR/Repair",
 cptCode: "33430",
 reimbursement: 186200,
 averageCost: 98400,
 margin: 47.2,
 volume: 86
 },
 {
 name: "LAAO Device",
 cptCode: "33340",
 reimbursement: 67420,
 averageCost: 28900,
 margin: 57.1,
 volume: 62
 }
  ],

  qualityMetrics: [
 {
 name: "TAVR 30-Day Mortality",
 target: 3.0,
 unit: "%",
 currentValue: 2.1
 },
 {
 name: "TAVR Stroke Rate",
 target: 3.0,
 unit: "%",
 currentValue: 1.8
 },
 {
 name: "New Permanent Pacemaker Post-TAVR",
 target: 12,
 unit: "%",
 currentValue: 9.4
 },
 {
 name: "TEER Procedural Success",
 target: 95,
 unit: "%",
 currentValue: 97
 },
 {
 name: "Length of Stay (TAVR)",
 target: 3,
 unit: "days",
 currentValue: 2.4
 },
 {
 name: "1-Year Valve Durability",
 target: 98,
 unit: "%",
 currentValue: 99.2
 }
  ],

  clinicalConditions: [
 {
 name: "Severe Aortic Stenosis",
 prevalenceRate: 28.4,
 detectionCriteria: [
 "AVA <1.0 cm\u00B2",
 "Mean gradient >40 mmHg",
 "Peak velocity >4.0 m/s"
 ],
 riskFactors: ["Age >70", "Bicuspid valve", "Calcific disease"]
 },
 {
 name: "Severe Mitral Regurgitation",
 prevalenceRate: 22.6,
 detectionCriteria: [
 "Regurgitant volume >60 mL",
 "EROA >0.4 cm\u00B2",
 "Vena contracta >7 mm"
 ],
 riskFactors: ["Ischemic cardiomyopathy", "Mitral prolapse", "Annular dilation"]
 },
 {
 name: "Structural Valve Deterioration",
 prevalenceRate: 8.2,
 detectionCriteria: [
 "Increasing transvalvular gradient",
 "New regurgitation",
 "Leaflet calcification"
 ],
 riskFactors: ["Younger age at implant", "Renal disease", "Patient-prosthesis mismatch"]
 },
 {
 name: "Low-Flow Low-Gradient AS",
 prevalenceRate: 12.8,
 detectionCriteria: [
 "AVA <1.0 cm\u00B2",
 "Mean gradient <40 mmHg",
 "LVEF <50% or stroke volume index <35 mL/m\u00B2"
 ],
 riskFactors: ["LV dysfunction", "Small body size", "Elderly"]
 }
  ],

  therapeuticInterventions: [
 {
 name: "Dual Antiplatelet Therapy Post-TAVR",
 clinicalIndication: "Prevention of valve thrombosis post-TAVR",
 annualCost: 1800,
 efficacyRate: 89
 },
 {
 name: "Anticoagulation Post-Bioprosthetic",
 clinicalIndication: "Early thromboprophylaxis after surgical valve replacement",
 annualCost: 2400,
 efficacyRate: 92
 },
 {
 name: "Heart Failure Optimization Pre-TAVR",
 clinicalIndication: "Hemodynamic optimization before transcatheter intervention",
 annualCost: 8400,
 efficacyRate: 76
 },
 {
 name: "Structural Heart Rehabilitation",
 clinicalIndication: "Post-procedure exercise and functional optimization",
 annualCost: 4200,
 efficacyRate: 72
 }
  ]
};

// ====================
// CORONARY INTERVENTION MODULE
// ====================
const coronaryInterventionData: ModuleClinicalData = {
  keyProcedures: [
 {
 name: "PCI with DES",
 cptCode: "92928",
 reimbursement: 42600,
 averageCost: 18400,
 margin: 56.8,
 volume: 687
 },
 {
 name: "CABG",
 cptCode: "33533",
 reimbursement: 198400,
 averageCost: 98600,
 margin: 50.3,
 volume: 234
 },
 {
 name: "Diagnostic Coronary Angiography",
 cptCode: "93458",
 reimbursement: 12800,
 averageCost: 4600,
 margin: 64.1,
 volume: 1245
 },
 {
 name: "FFR/iFR Assessment",
 cptCode: "93571",
 reimbursement: 8400,
 averageCost: 3200,
 margin: 61.9,
 volume: 534
 },
 {
 name: "Intravascular Imaging (IVUS/OCT)",
 cptCode: "92978",
 reimbursement: 6200,
 averageCost: 2800,
 margin: 54.8,
 volume: 412
 },
 {
 name: "Rotational Atherectomy",
 cptCode: "92924",
 reimbursement: 38400,
 averageCost: 16800,
 margin: 56.3,
 volume: 89
 },
 {
 name: "Chronic Total Occlusion PCI",
 cptCode: "92943",
 reimbursement: 52400,
 averageCost: 24600,
 margin: 53.1,
 volume: 56
 },
 {
 name: "Intra-Aortic Balloon Pump",
 cptCode: "33967",
 reimbursement: 18600,
 averageCost: 8400,
 margin: 54.8,
 volume: 78
 }
  ],

  qualityMetrics: [
 {
 name: "D2B Time <90 min (STEMI)",
 target: 95,
 unit: "%",
 currentValue: 92
 },
 {
 name: "PCI Complication Rate",
 target: 3,
 unit: "%",
 currentValue: 2.4
 },
 {
 name: "Unplanned CABG After PCI",
 target: 0.5,
 unit: "%",
 currentValue: 0.3
 },
 {
 name: "Radial Access Utilization",
 target: 80,
 unit: "%",
 currentValue: 74
 },
 {
 name: "Appropriate Use Criteria Compliance",
 target: 90,
 unit: "%",
 currentValue: 86
 },
 {
 name: "30-Day MACE Rate",
 target: 4,
 unit: "%",
 currentValue: 3.2
 }
  ],

  clinicalConditions: [
 {
 name: "Acute STEMI",
 prevalenceRate: 8.4,
 detectionCriteria: [
 "ST elevation \u22651mm in \u22652 contiguous leads",
 "Acute chest pain",
 "Troponin elevation"
 ],
 riskFactors: ["Smoking", "DM", "HTN", "Dyslipidemia", "Family history"]
 },
 {
 name: "Chronic Stable Angina",
 prevalenceRate: 34.2,
 detectionCriteria: [
 "Exertional chest pain",
 "Positive stress test",
 "\u226570% stenosis on angiography"
 ],
 riskFactors: ["Age", "DM", "HTN", "Prior CAD"]
 },
 {
 name: "NSTEMI/Unstable Angina",
 prevalenceRate: 22.6,
 detectionCriteria: [
 "Troponin elevation without ST elevation",
 "Dynamic ECG changes",
 "Recurrent angina at rest"
 ],
 riskFactors: ["Prior MI", "DM", "CKD", "Advanced age"]
 },
 {
 name: "Multi-Vessel CAD",
 prevalenceRate: 18.8,
 detectionCriteria: [
 "\u226570% stenosis in \u22652 major epicardial vessels",
 "SYNTAX score >22"
 ],
 riskFactors: ["Diabetes", "Prior PCI", "LV dysfunction"]
 }
  ],

  therapeuticInterventions: [
 {
 name: "High-Intensity Statin Therapy",
 clinicalIndication: "Secondary prevention in established CAD",
 annualCost: 1200,
 efficacyRate: 88
 },
 {
 name: "DAPT (Aspirin + P2Y12 Inhibitor)",
 clinicalIndication: "Post-PCI thromboprophylaxis",
 annualCost: 2400,
 efficacyRate: 94
 },
 {
 name: "Cardiac Rehabilitation",
 clinicalIndication: "Post-MI and post-revascularization functional recovery",
 annualCost: 4800,
 efficacyRate: 82
 },
 {
 name: "PCSK9 Inhibitors",
 clinicalIndication: "Refractory hyperlipidemia despite maximally tolerated statin",
 annualCost: 14400,
 efficacyRate: 76
 }
  ]
};

// ====================
// VALVULAR DISEASE MODULE
// ====================
const valvularDiseaseData: ModuleClinicalData = {
  keyProcedures: [
 {
 name: "Surgical Aortic Valve Replacement",
 cptCode: "33405",
 reimbursement: 198400,
 averageCost: 102600,
 margin: 48.3,
 volume: 156
 },
 {
 name: "Surgical Mitral Valve Repair",
 cptCode: "33426",
 reimbursement: 178600,
 averageCost: 92400,
 margin: 48.3,
 volume: 98
 },
 {
 name: "Surgical Mitral Valve Replacement",
 cptCode: "33430",
 reimbursement: 186200,
 averageCost: 98400,
 margin: 47.2,
 volume: 64
 },
 {
 name: "Tricuspid Valve Repair",
 cptCode: "33463",
 reimbursement: 168400,
 averageCost: 88200,
 margin: 47.6,
 volume: 42
 },
 {
 name: "Ross Procedure",
 cptCode: "33413",
 reimbursement: 224600,
 averageCost: 118400,
 margin: 47.3,
 volume: 12
 },
 {
 name: "Multi-Valve Surgery",
 cptCode: "33405+33430",
 reimbursement: 312800,
 averageCost: 168400,
 margin: 46.2,
 volume: 28
 },
 {
 name: "Valve-Sparing Aortic Root Replacement",
 cptCode: "33864",
 reimbursement: 248600,
 averageCost: 132400,
 margin: 46.7,
 volume: 18
 },
 {
 name: "Transcatheter Tricuspid Intervention",
 cptCode: "0569T",
 reimbursement: 124800,
 averageCost: 62400,
 margin: 50.0,
 volume: 16
 }
  ],

  qualityMetrics: [
 {
 name: "Operative Mortality (Isolated AVR)",
 target: 2.5,
 unit: "%",
 currentValue: 1.8
 },
 {
 name: "Operative Mortality (Isolated MVR)",
 target: 3.0,
 unit: "%",
 currentValue: 2.2
 },
 {
 name: "Mitral Repair vs Replacement Rate",
 target: 80,
 unit: "%",
 currentValue: 76
 },
 {
 name: "STS Predicted/Observed Mortality Ratio",
 target: 1.0,
 unit: "ratio",
 currentValue: 0.82
 },
 {
 name: "Postoperative AF Rate",
 target: 25,
 unit: "%",
 currentValue: 22
 },
 {
 name: "Blood Transfusion Rate",
 target: 40,
 unit: "%",
 currentValue: 34
 }
  ],

  clinicalConditions: [
 {
 name: "Degenerative Mitral Regurgitation",
 prevalenceRate: 26.4,
 detectionCriteria: [
 "Mitral leaflet prolapse/flail",
 "Severe MR on echo",
 "LVEDV dilation"
 ],
 riskFactors: ["Age", "Connective tissue disease", "Endocarditis history"]
 },
 {
 name: "Calcific Aortic Stenosis (Surgical Candidate)",
 prevalenceRate: 32.6,
 detectionCriteria: [
 "AVA <1.0 cm\u00B2",
 "Symptoms (angina/syncope/dyspnea)",
 "Low-intermediate surgical risk"
 ],
 riskFactors: ["Age >65", "Bicuspid valve", "CKD"]
 },
 {
 name: "Rheumatic Valve Disease",
 prevalenceRate: 8.4,
 detectionCriteria: [
 "Mitral stenosis with commissural fusion",
 "Rheumatic echo features",
 "Valve area <1.5 cm\u00B2"
 ],
 riskFactors: ["Rheumatic fever history", "Endemic region origin"]
 },
 {
 name: "Tricuspid Regurgitation (Functional)",
 prevalenceRate: 18.2,
 detectionCriteria: [
 "Annular dilation >40mm",
 "RV dilation",
 "Severe TR on echo"
 ],
 riskFactors: ["Left-sided valve disease", "Pulmonary HTN", "AF"]
 }
  ],

  therapeuticInterventions: [
 {
 name: "Anticoagulation (Mechanical Valve)",
 clinicalIndication: "Lifelong thromboprophylaxis for mechanical prostheses",
 annualCost: 1800,
 efficacyRate: 96
 },
 {
 name: "Endocarditis Prophylaxis",
 clinicalIndication: "Dental/surgical prophylaxis in prosthetic valve patients",
 annualCost: 400,
 efficacyRate: 92
 },
 {
 name: "Heart Failure Medical Therapy",
 clinicalIndication: "Volume management and afterload reduction in valvular heart disease",
 annualCost: 3600,
 efficacyRate: 68
 },
 {
 name: "Post-Surgical Cardiac Rehabilitation",
 clinicalIndication: "Functional recovery after valve surgery",
 annualCost: 5200,
 efficacyRate: 74
 }
  ]
};

// ====================
// PERIPHERAL VASCULAR MODULE
// ====================
const peripheralVascularData: ModuleClinicalData = {
  keyProcedures: [
 {
 name: "Lower Extremity Angioplasty/Stent",
 cptCode: "37226",
 reimbursement: 32400,
 averageCost: 14200,
 margin: 56.2,
 volume: 342
 },
 {
 name: "Atherectomy",
 cptCode: "37225",
 reimbursement: 28600,
 averageCost: 12800,
 margin: 55.2,
 volume: 186
 },
 {
 name: "Carotid Endarterectomy",
 cptCode: "35301",
 reimbursement: 42800,
 averageCost: 18600,
 margin: 56.5,
 volume: 124
 },
 {
 name: "Carotid Artery Stenting",
 cptCode: "37215",
 reimbursement: 48600,
 averageCost: 22400,
 margin: 53.9,
 volume: 68
 },
 {
 name: "Aortic Endograft (EVAR)",
 cptCode: "34802",
 reimbursement: 86400,
 averageCost: 42600,
 margin: 50.7,
 volume: 94
 },
 {
 name: "Peripheral Bypass Graft",
 cptCode: "35556",
 reimbursement: 68400,
 averageCost: 34200,
 margin: 50.0,
 volume: 56
 },
 {
 name: "Thrombectomy/Embolectomy",
 cptCode: "34201",
 reimbursement: 38200,
 averageCost: 16400,
 margin: 57.1,
 volume: 78
 },
 {
 name: "Wound Care/Debridement",
 cptCode: "97597",
 reimbursement: 4200,
 averageCost: 1800,
 margin: 57.1,
 volume: 456
 }
  ],

  qualityMetrics: [
 {
 name: "Primary Patency Rate (12-month)",
 target: 75,
 unit: "%",
 currentValue: 78
 },
 {
 name: "CLI Limb Salvage Rate",
 target: 85,
 unit: "%",
 currentValue: 88
 },
 {
 name: "Perioperative Stroke Rate (CEA)",
 target: 2,
 unit: "%",
 currentValue: 1.4
 },
 {
 name: "30-Day Amputation Rate",
 target: 5,
 unit: "%",
 currentValue: 3.8
 },
 {
 name: "ABI Improvement Post-Intervention",
 target: 0.15,
 unit: "ABI delta",
 currentValue: 0.22
 },
 {
 name: "Wound Healing Rate (CLI)",
 target: 70,
 unit: "%",
 currentValue: 74
 }
  ],

  clinicalConditions: [
 {
 name: "Claudication (Fontaine II)",
 prevalenceRate: 38.4,
 detectionCriteria: [
 "ABI 0.4-0.9",
 "Reproducible exertional leg pain",
 "Walking impairment"
 ],
 riskFactors: ["Smoking", "DM", "Dyslipidemia", "Age >60"]
 },
 {
 name: "Critical Limb Ischemia (Fontaine III-IV)",
 prevalenceRate: 18.6,
 detectionCriteria: [
 "ABI <0.4 or TBI <0.3",
 "Rest pain",
 "Tissue loss/gangrene"
 ],
 riskFactors: ["DM", "ESRD", "Smoking", "Non-ambulatory"]
 },
 {
 name: "Carotid Stenosis (Symptomatic)",
 prevalenceRate: 12.8,
 detectionCriteria: [
 "\u226550% stenosis with TIA/stroke",
 "Carotid duplex velocity >125 cm/s"
 ],
 riskFactors: ["HTN", "Smoking", "AF", "Prior stroke"]
 },
 {
 name: "Aortic Aneurysm",
 prevalenceRate: 14.2,
 detectionCriteria: [
 "Aortic diameter \u22655.5 cm (men) or \u22655.0 cm (women)",
 "Rapid expansion >0.5 cm/6 months"
 ],
 riskFactors: ["Male", "Smoking", "Family history", "Connective tissue disease"]
 }
  ],

  therapeuticInterventions: [
 {
 name: "Supervised Exercise Therapy",
 clinicalIndication: "First-line treatment for claudication",
 annualCost: 3600,
 efficacyRate: 72
 },
 {
 name: "Cilostazol",
 clinicalIndication: "Symptom improvement in intermittent claudication",
 annualCost: 1800,
 efficacyRate: 58
 },
 {
 name: "Wound Care Program",
 clinicalIndication: "Multidisciplinary limb salvage for critical limb ischemia",
 annualCost: 24000,
 efficacyRate: 74
 },
 {
 name: "Smoking Cessation Program",
 clinicalIndication: "Risk factor modification in PAD patients",
 annualCost: 2400,
 efficacyRate: 34
 }
  ]
};

export const modulesClinicalData = {
  electrophysiology: electrophysiologyData,
  heartFailure: heartFailureData,
  structuralHeart: structuralHeartData,
  coronaryIntervention: coronaryInterventionData,
  valvularDisease: valvularDiseaseData,
  peripheralVascular: peripheralVascularData,
};

export default modulesClinicalData;
