import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo hospitals
  const demoHospital1 = await prisma.hospital.upsert({
    where: { id: 'hosp-001' },
    update: {},
    create: {
      id: 'hosp-001',
      name: 'TAILRD Demo Hospital',
      system: 'TAILRD Health Network',
      npi: '1234567890',
      patientCount: 485000,
      bedCount: 650,
      hospitalType: 'ACADEMIC',
      street: '123 Medical Center Dr',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
      redoxSourceId: 'demo-001',
      redoxDestinationId: 'tailrd-001',
      redoxWebhookUrl: 'https://api.tailrd.com/webhooks/redox/hosp-001',
      redoxIsActive: true,
      moduleHeartFailure: true,
      moduleElectrophysiology: true,
      moduleStructuralHeart: true,
      moduleCoronaryIntervention: true,
      modulePeripheralVascular: true,
      moduleValvularDisease: true,
      subscriptionTier: 'ENTERPRISE',
      subscriptionStart: new Date('2024-01-01'),
      subscriptionActive: true,
      maxUsers: 50,
    },
  });

  const demoHospital2 = await prisma.hospital.upsert({
    where: { id: 'hosp-002' },
    update: {},
    create: {
      id: 'hosp-002',
      name: 'TAILRD Demo Hospital 2',
      npi: '2345678901',
      patientCount: 180000,
      bedCount: 250,
      hospitalType: 'COMMUNITY',
      street: '456 Community Blvd',
      city: 'Riverside',
      state: 'CA',
      zipCode: '92501',
      country: 'USA',
      redoxSourceId: 'community-002',
      redoxDestinationId: 'tailrd-002',
      redoxWebhookUrl: 'https://api.tailrd.com/webhooks/redox/hosp-002',
      redoxIsActive: true,
      moduleHeartFailure: true,
      moduleElectrophysiology: false,
      moduleStructuralHeart: false,
      moduleCoronaryIntervention: true,
      modulePeripheralVascular: true,
      moduleValvularDisease: false,
      subscriptionTier: 'PROFESSIONAL',
      subscriptionStart: new Date('2024-03-15'),
      subscriptionActive: true,
      maxUsers: 25,
    },
  });

  console.log('✅ Created hospitals:', { demoHospital1: demoHospital1.id, demoHospital2: demoHospital2.id });

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('demo123', 12);

  // Create demo users
  const sarahJohnson = await prisma.user.upsert({
    where: { email: 'admin@demo.tailrd-heart.com' },
    update: {},
    create: {
      id: 'user-001',
      email: 'admin@demo.tailrd-heart.com',
      passwordHash: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      title: 'Chief Medical Officer',
      role: 'HOSPITAL_ADMIN',
      hospitalId: 'hosp-001',
      // Module permissions - full access
      permHeartFailure: true,
      permElectrophysiology: true,
      permStructuralHeart: true,
      permCoronaryIntervention: true,
      permPeripheralVascular: true,
      permValvularDisease: true,
      // View permissions - full access
      permExecutiveView: true,
      permServiceLineView: true,
      permCareTeamView: true,
      // Action permissions - full access
      permViewReports: true,
      permExportData: true,
      permManageUsers: true,
      permConfigureAlerts: true,
      permAccessPHI: true,
    },
  });

  const michaelChen = await prisma.user.upsert({
    where: { email: 'cardio@demo.tailrd-heart.com' },
    update: {},
    create: {
      id: 'user-002',
      email: 'cardio@demo.tailrd-heart.com',
      passwordHash: hashedPassword,
      firstName: 'Dr. Michael',
      lastName: 'Chen',
      title: 'Interventional Cardiologist',
      npi: '1234567891',
      role: 'PHYSICIAN',
      hospitalId: 'hosp-001',
      // Module permissions - limited to cardiology
      permHeartFailure: true,
      permElectrophysiology: false,
      permStructuralHeart: true,
      permCoronaryIntervention: true,
      permPeripheralVascular: false,
      permValvularDisease: false,
      // View permissions - clinical focus
      permExecutiveView: false,
      permServiceLineView: true,
      permCareTeamView: true,
      // Action permissions - standard physician
      permViewReports: true,
      permExportData: false,
      permManageUsers: false,
      permConfigureAlerts: false,
      permAccessPHI: true,
    },
  });

  const lisaRodriguez = await prisma.user.upsert({
    where: { email: 'quality@demo.tailrd-heart.com' },
    update: {},
    create: {
      id: 'user-003',
      email: 'quality@demo.tailrd-heart.com',
      passwordHash: hashedPassword,
      firstName: 'Lisa',
      lastName: 'Rodriguez',
      title: 'Quality Director',
      role: 'QUALITY_DIRECTOR',
      hospitalId: 'hosp-002',
      // Module permissions - limited modules
      permHeartFailure: true,
      permElectrophysiology: false,
      permStructuralHeart: false,
      permCoronaryIntervention: true,
      permPeripheralVascular: true,
      permValvularDisease: false,
      // View permissions - quality focus
      permExecutiveView: true,
      permServiceLineView: true,
      permCareTeamView: false,
      // Action permissions - quality director
      permViewReports: true,
      permExportData: true,
      permManageUsers: false,
      permConfigureAlerts: true,
      permAccessPHI: false, // No PHI access for quality director
    },
  });

  console.log('✅ Created users:', { 
    sarahJohnson: sarahJohnson.email, 
    michaelChen: michaelChen.email, 
    lisaRodriguez: lisaRodriguez.email 
  });

  // Create sample patients for Demo Hospital 1
  const demo1Patients = [];
  for (let i = 1; i <= 10; i++) {
    const patient = await prisma.patient.create({
      data: {
        mrn: `SMC${String(i).padStart(6, '0')}`,
        firstName: `Patient${i}`,
        lastName: `Demo`,
        dateOfBirth: new Date(1950 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        phone: `555-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        street: `${100 + i} Main St`,
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        hospitalId: 'hosp-001',
        isActive: true,
        riskScore: Math.random() * 100,
        riskCategory: i % 3 === 0 ? 'HIGH' : i % 3 === 1 ? 'MODERATE' : 'LOW',
        lastAssessment: new Date(),
        heartFailurePatient: i <= 5,
        coronaryPatient: i <= 7,
        electrophysiologyPatient: i <= 3,
        structuralHeartPatient: i <= 2,
        peripheralVascularPatient: i <= 4,
        valvularDiseasePatient: i <= 3,
      },
    });
    demo1Patients.push(patient);
  }

  // Create sample patients for Demo Hospital 2
  const demo2Patients = [];
  for (let i = 1; i <= 5; i++) {
    const patient = await prisma.patient.create({
      data: {
        mrn: `CGH${String(i).padStart(6, '0')}`,
        firstName: `Patient${i}`,
        lastName: `Community`,
        dateOfBirth: new Date(1955 + Math.floor(Math.random() * 45), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        phone: `951-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        street: `${200 + i} Oak Ave`,
        city: 'Riverside',
        state: 'CA',
        zipCode: '92501',
        hospitalId: 'hosp-002',
        isActive: true,
        riskScore: Math.random() * 100,
        riskCategory: i % 2 === 0 ? 'MODERATE' : 'LOW',
        lastAssessment: new Date(),
        heartFailurePatient: i <= 3,
        coronaryPatient: i <= 4,
        peripheralVascularPatient: i <= 2,
      },
    });
    demo2Patients.push(patient);
  }

  console.log('✅ Created patients:', { 
    demo1Count: demo1Patients.length, 
    communityCount: demo2Patients.length 
  });

  // Create sample encounters for each patient
  for (const patient of [...demo1Patients, ...demo2Patients]) {
    // Create 1-3 encounters per patient
    const encounterCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < encounterCount; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // Within last 30 days
      
      await prisma.encounter.create({
        data: {
          patient: { connect: { id: patient.id } },
          hospital: { connect: { id: patient.hospitalId } },
          encounterNumber: `ENC${Date.now()}${i}`,
          encounterType: Math.random() > 0.5 ? 'OUTPATIENT' : 'INPATIENT',
          status: 'FINISHED',
          startDateTime: startDate,
          endDateTime: new Date(startDate.getTime() + (Math.random() * 4 * 60 * 60 * 1000)),
          department: 'Cardiology',
          location: patient.hospitalId === 'hosp-001' ? 'Demo Hospital 1' : 'Demo Hospital 2',
          attendingProvider: patient.hospitalId === 'hosp-001' ? 'Dr. Michael Chen' : 'Dr. Sarah Martinez',
          chiefComplaint: 'Chest pain',
          primaryDiagnosis: 'Heart failure',
        },
      });
    }
  }

  // Create sample observations (lab results, vitals)
  for (const patient of [...demo1Patients, ...demo2Patients]) {
    // Create some lab results
    await prisma.observation.create({
      data: {
        patient: { connect: { id: patient.id } },
        hospital: { connect: { id: patient.hospitalId } },
        observationType: 'LOINC:33747-0',
        observationName: 'NT-proBNP',
        category: 'LABORATORY',
        valueNumeric: Math.random() * 10000 + 100,
        unit: 'pg/mL',
        referenceRangeLow: 0,
        referenceRangeHigh: 125,
        isAbnormal: Math.random() > 0.3,
        observedDateTime: new Date(),
        orderingProvider: 'Dr. Smith',
        performingLab: 'Hospital Lab',
      },
    });

    // Create vital signs
    await prisma.observation.create({
      data: {
        patient: { connect: { id: patient.id } },
        hospital: { connect: { id: patient.hospitalId } },
        observationType: 'LOINC:8480-6',
        observationName: 'Systolic Blood Pressure',
        category: 'VITAL_SIGNS',
        valueNumeric: Math.random() * 50 + 110, // 110-160
        unit: 'mmHg',
        referenceRangeLow: 90,
        referenceRangeHigh: 140,
        isAbnormal: Math.random() > 0.5,
        observedDateTime: new Date(),
      },
    });
  }

  // Create sample alerts
  for (let i = 0; i < 5; i++) {
    const randomPatient = [...demo1Patients, ...demo2Patients][Math.floor(Math.random() * 15)];
    
    await prisma.alert.create({
      data: {
        patientId: randomPatient.id,
        hospitalId: randomPatient.hospitalId,
        alertType: 'CLINICAL',
        severity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
        title: 'Abnormal Lab Value',
        message: 'NT-proBNP levels are elevated, consider medication adjustment',
        moduleType: 'HEART_FAILURE',
        actionRequired: Math.random() > 0.5,
        isAcknowledged: Math.random() > 0.7,
        triggeredAt: new Date(),
        triggerData: {
          labValue: 'NT-proBNP: 2500 pg/mL',
          threshold: 'Normal: <125 pg/mL',
        },
      },
    });
  }

  // Create sample recommendations
  for (let i = 0; i < 5; i++) {
    const randomPatient = [...demo1Patients, ...demo2Patients][Math.floor(Math.random() * 15)];

    await prisma.recommendation.create({
      data: {
        patientId: randomPatient.id,
        hospitalId: randomPatient.hospitalId,
        recommendationType: 'MEDICATION',
        priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
        title: 'ACE Inhibitor Optimization',
        description: 'Consider increasing ACE inhibitor dose to maximum tolerated dose per HF guidelines',
        evidence: 'Class I recommendation for HFrEF patients (ACC/AHA 2022)',
        moduleType: 'HEART_FAILURE',
        isImplemented: Math.random() > 0.7,
        evidenceLevel: 'A',
        guidelineSource: 'ACC/AHA 2022 Heart Failure Guidelines',
      },
    });
  }

  // ============================================
  // Group B Clinical Intelligence Seed Data
  // ============================================

  // Coronary phenotype detections
  const coronaryPts = demo1Patients.filter((p: any) => p.coronaryPatient);
  for (let ci = 0; ci < Math.min(3, coronaryPts.length); ci++) {
    const phenoNames: any[] = ['CMD', 'VASOSPASTIC_ANGINA', 'CALCIFIC_CAD'];
    await prisma.phenotype.create({
      data: {
        patientId: coronaryPts[ci].id,
        hospitalId: 'hosp-001',
        phenotypeName: phenoNames[ci % 3],
        status: 'DETECTED',
        confidence: 0.7 + Math.random() * 0.25,
        evidence: { triggers: ['Exertional angina', 'Non-obstructive catheterization'], labValues: { hsCRP: 3.2, LDL: 145 } },
        riskScore: Math.random() * 80 + 20,
        riskFactors: { smoking: true, diabetes: false, familyHistory: true },
      },
    });
  }

  // Valvular phenotype detections
  const valvularPts = demo1Patients.filter((p: any) => p.valvularDiseasePatient);
  for (let vi = 0; vi < Math.min(2, valvularPts.length); vi++) {
    const valvePhenos: any[] = ['LFLG_AORTIC_STENOSIS', 'BPV_DEGENERATION'];
    await prisma.phenotype.create({
      data: {
        patientId: valvularPts[vi].id,
        hospitalId: 'hosp-001',
        phenotypeName: valvePhenos[vi % 2],
        status: 'SUSPECTED',
        confidence: 0.65 + Math.random() * 0.2,
        evidence: { triggers: ['Low gradient on echo'], echoFindings: { avArea: 0.8, meanGradient: 28, lvef: 38 } },
        riskScore: Math.random() * 60 + 40,
      },
    });
  }

  // Peripheral phenotype detections
  const padPts = demo1Patients.filter((p: any) => p.peripheralVascularPatient);
  for (let pi = 0; pi < Math.min(2, padPts.length); pi++) {
    const padPhenos: any[] = ['CLTI', 'DIABETIC_FOOT'];
    await prisma.phenotype.create({
      data: {
        patientId: padPts[pi].id,
        hospitalId: 'hosp-001',
        phenotypeName: padPhenos[pi % 2],
        status: 'CONFIRMED',
        confidence: 0.85 + Math.random() * 0.1,
        evidence: { triggers: ['Rest pain', 'ABI < 0.4'], vascularStudy: { abi: 0.35, toePressure: 25 } },
        riskScore: Math.random() * 30 + 70,
        riskFactors: { diabetes: true, smoking: true, ckd: false },
      },
    });
  }

  // Risk Score Assessments - Coronary (GRACE + SYNTAX)
  if (coronaryPts.length > 0) {
    await prisma.riskScoreAssessment.create({
      data: {
        patientId: coronaryPts[0].id, hospitalId: 'hosp-001',
        scoreType: 'GRACE', module: 'CORONARY_INTERVENTION', totalScore: 142, riskCategory: 'HIGH',
        components: { age: 3, heartRate: 1, systolicBP: 2, creatinine: 1, killip: 0, stChanges: 1, biomarkers: 1 },
        inputData: { age: 68, heartRate: 88, systolicBP: 135, creatinine: 1.4, killipClass: 1 },
        interpretation: 'High risk - 6-month mortality >8%. Consider early invasive strategy.',
        recommendation: 'Early cardiac catheterization within 24-48 hours',
        mortality: 12.5, calculatedBy: 'user-002', clinicalContext: 'ACS presentation - NSTEMI workup',
      },
    });
    await prisma.riskScoreAssessment.create({
      data: {
        patientId: coronaryPts[0].id, hospitalId: 'hosp-001',
        scoreType: 'SYNTAX', module: 'CORONARY_INTERVENTION', totalScore: 28, riskCategory: 'MODERATE',
        components: { lesions: 3, bifurcation: 2, totalOcclusion: 0, calcification: 1, leftMain: 0, thrombus: 1 },
        inputData: { numberOfLesions: 3, bifurcationLesions: true, calcification: 'moderate' },
        interpretation: 'Intermediate complexity. Heart Team discussion recommended.',
        recommendation: 'Heart Team decision: PCI vs CABG',
        calculatedBy: 'user-002', clinicalContext: 'Post-catheterization revascularization planning',
      },
    });
  }

  // Risk Score Assessment - Valvular (STS)
  if (valvularPts.length > 0) {
    await prisma.riskScoreAssessment.create({
      data: {
        patientId: valvularPts[0].id, hospitalId: 'hosp-001',
        scoreType: 'STS_SCORE', module: 'VALVULAR_DISEASE', totalScore: 5.2, riskCategory: 'MODERATE',
        components: { age: 1.8, gender: 0.3, renal: 0.5, lvef: 0.8, nyha: 0.6, redo: 0, emergent: 0 },
        inputData: { age: 76, gender: 'male', lvef: 42, nyhaClass: 3, creatinine: 1.6 },
        interpretation: 'Intermediate surgical risk (STS 4-8%). Heart Team discussion for TAVR vs SAVR.',
        recommendation: 'TAVR preferred given intermediate risk and anatomy',
        mortality: 5.2, calculatedBy: 'user-002', clinicalContext: 'Severe aortic stenosis - surgical risk assessment',
      },
    });
  }

  // Risk Score Assessment - Peripheral (ABI)
  if (padPts.length > 0) {
    await prisma.riskScoreAssessment.create({
      data: {
        patientId: padPts[0].id, hospitalId: 'hosp-001',
        scoreType: 'ABI_ASSESSMENT', module: 'PERIPHERAL_VASCULAR', totalScore: 0.45, riskCategory: 'HIGH',
        components: { rightABI: 0.45, leftABI: 0.52, toePressure: 28, fontaine: 3, rutherford: 4 },
        inputData: { abi: 0.45, restPain: true, tissueLoss: false, claudicationDistance: 50 },
        interpretation: 'Severe PAD - Fontaine Stage III, Rutherford Category 4.',
        recommendation: 'Urgent vascular surgery consultation for revascularization',
        calculatedBy: 'user-002', clinicalContext: 'PAD staging with rest pain',
      },
    });
  }

  // Intervention Tracking - Coronary DES
  if (coronaryPts.length > 1) {
    await prisma.interventionTracking.create({
      data: {
        patientId: coronaryPts[1].id, hospitalId: 'hosp-001',
        interventionName: 'DES Implantation - LAD', category: 'PERCUTANEOUS', module: 'CORONARY_INTERVENTION', status: 'COMPLETED',
        cptCode: '92928', reimbursementCode: 'DRG 247',
        performedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        performingProvider: 'Dr. Michael Chen', indication: 'Severe LAD stenosis (90%) with positive FFR',
        technique: 'IVUS-guided DES implantation, 3.5x28mm Xience Sierra',
        findings: { prePCI: '90% LAD stenosis', postPCI: '0% residual', ffr: 0.72 },
        outcome: 'Successful', followUpPlan: 'DAPT x 12 months, stress test at 6 months', estimatedReimbursement: 15000,
      },
    });
  }

  // Intervention Tracking - Valvular TAVR
  if (valvularPts.length > 0) {
    await prisma.interventionTracking.create({
      data: {
        patientId: valvularPts[0].id, hospitalId: 'hosp-001',
        interventionName: 'TAVR - Edwards SAPIEN 3', category: 'PERCUTANEOUS', module: 'VALVULAR_DISEASE', status: 'SCHEDULED',
        cptCode: '33361', scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        performingProvider: 'Dr. Heart Team', indication: 'Severe symptomatic aortic stenosis, STS 5.2%', estimatedReimbursement: 52000,
      },
    });
  }

  // Intervention Tracking - Peripheral Endovascular
  if (padPts.length > 0) {
    await prisma.interventionTracking.create({
      data: {
        patientId: padPts[0].id, hospitalId: 'hosp-001',
        interventionName: 'Endovascular Revascularization - SFA', category: 'PERCUTANEOUS', module: 'PERIPHERAL_VASCULAR', status: 'COMPLETED',
        cptCode: '37226', performedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        performingProvider: 'Dr. Vascular Team', indication: 'Severe SFA stenosis with rest pain (Rutherford 4)',
        technique: 'Drug-coated balloon angioplasty with bailout stenting',
        findings: { preProcedure: '85% SFA occlusion', postProcedure: 'Patent with good flow' },
        outcome: 'Successful', followUpPlan: 'Duplex ultrasound at 1, 3, 6 months',
        estimatedReimbursement: 14000, actualReimbursement: 13200,
      },
    });
  }

  // Contraindication Assessment - Coronary
  if (coronaryPts.length > 0) {
    await prisma.contraindicationAssessment.create({
      data: {
        patientId: coronaryPts[0].id, hospitalId: 'hosp-001',
        module: 'CORONARY_INTERVENTION', therapyName: 'Prasugrel (Effient)', therapyType: 'medication',
        level: 'ABSOLUTE', reasons: ['Prior stroke/TIA', 'Age > 75 years'],
        alternatives: ['Ticagrelor 90mg BID', 'Clopidogrel 75mg daily'],
        monitoring: ['Bleeding assessment', 'Platelet function testing'],
        dosing: { startDose: 'N/A - contraindicated', alternative: 'Ticagrelor 90mg BID' },
        assessedBy: 'user-002',
      },
    });
  }

  // Contraindication Assessment - Peripheral
  if (padPts.length > 0) {
    await prisma.contraindicationAssessment.create({
      data: {
        patientId: padPts[0].id, hospitalId: 'hosp-001',
        module: 'PERIPHERAL_VASCULAR', therapyName: 'Surgical Bypass', therapyType: 'procedure',
        level: 'CAUTION', reasons: ['Prior cardiac surgery', 'Moderate renal impairment (eGFR 38)'],
        alternatives: ['Endovascular-first strategy', 'Hybrid revascularization'],
        monitoring: ['Cardiac clearance required', 'Renal optimization', 'Vein mapping'],
        assessedBy: 'user-002',
      },
    });
  }

  // Group B Alerts
  const groupBAlerts: Array<{ module: any; title: string; message: string; pts: any[] }> = [
    { module: 'CORONARY_INTERVENTION', title: 'DAPT Duration Alert', message: 'Patient approaching 12-month DAPT milestone post-DES.', pts: coronaryPts },
    { module: 'VALVULAR_DISEASE', title: 'Valve Gradient Increase', message: 'Bioprosthetic valve mean gradient increased from 18 to 32 mmHg.', pts: valvularPts },
    { module: 'PERIPHERAL_VASCULAR', title: 'ABI Decline Detected', message: 'ABI decreased from 0.65 to 0.45 over 6 months.', pts: padPts },
  ];
  for (const a of groupBAlerts) {
    if (a.pts.length > 0) {
      await prisma.alert.create({
        data: { patientId: a.pts[0].id, hospitalId: a.pts[0].hospitalId, alertType: 'CLINICAL', severity: 'HIGH', title: a.title, message: a.message, moduleType: a.module, actionRequired: true, triggeredAt: new Date() },
      });
    }
  }

  // Group B Recommendations
  const groupBRecs: Array<{ module: any; type: any; title: string; desc: string; ev: string; src: string; pts: any[] }> = [
    { module: 'CORONARY_INTERVENTION', type: 'PROCEDURE', title: 'IVUS-Guided PCI', desc: 'Consider IVUS guidance for left main PCI.', ev: 'ULTIMATE trial - 35% MACE reduction', src: 'ACC/AHA PCI Guidelines 2024', pts: coronaryPts },
    { module: 'VALVULAR_DISEASE', type: 'PROCEDURE', title: 'TAVR Evaluation', desc: 'Patient meets criteria for TAVR evaluation.', ev: 'PARTNER 3 - TAVR non-inferior to SAVR', src: 'ACC/AHA VHD Guidelines 2024', pts: valvularPts },
    { module: 'PERIPHERAL_VASCULAR', type: 'LIFESTYLE', title: 'Supervised Exercise Program', desc: 'Enroll in structured supervised exercise for claudication.', ev: 'CLEVER trial', src: 'AHA/ACC PAD Guidelines 2024', pts: padPts },
  ];
  for (const r of groupBRecs) {
    if (r.pts.length > 0) {
      await prisma.recommendation.create({
        data: { patientId: r.pts[0].id, hospitalId: r.pts[0].hospitalId, recommendationType: r.type, priority: 'HIGH', title: r.title, description: r.desc, evidence: r.ev, moduleType: r.module, evidenceLevel: 'A', guidelineSource: r.src },
      });
    }
  }

  // Drug Titration for Group B (using generalDrugClass)
  if (coronaryPts.length > 0) {
    await prisma.drugTitration.create({
      data: {
        patientId: coronaryPts[0].id, hospitalId: 'hosp-001',
        generalDrugClass: 'STATIN', module: 'CORONARY_INTERVENTION',
        drugName: 'Rosuvastatin', currentDose: 20, currentDoseUnit: 'mg', targetDose: 40, targetDoseUnit: 'mg',
        nextStepDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), nextStepDose: 40, titrationStep: 2,
        barriers: { ldlNotAtGoal: true, currentLDL: 82, targetLDL: 55 },
        monitoringPlan: { lipidPanel: '6 weeks post-titration', liverFunction: '3 months' },
      },
    });
  }
  if (padPts.length > 0) {
    await prisma.drugTitration.create({
      data: {
        patientId: padPts[0].id, hospitalId: 'hosp-001',
        generalDrugClass: 'CILOSTAZOL', module: 'PERIPHERAL_VASCULAR',
        drugName: 'Cilostazol', currentDose: 50, currentDoseUnit: 'mg', targetDose: 100, targetDoseUnit: 'mg',
        nextStepDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), nextStepDose: 100, titrationStep: 1,
        barriers: { headache: true, tolerating: 'partial' },
        monitoringPlan: { walkingDistance: 'Baseline and 3 months', sideEffects: 'Weekly' },
      },
    });
  }

  console.log('Group B clinical intelligence data seeded!');

  console.log('Database seeded successfully!');
  console.log('\nDemo Users Created:');
  console.log('1. admin@demo.tailrd-heart.com (Hospital Admin) - Password: demo123');
  console.log('2. cardio@demo.tailrd-heart.com (Physician) - Password: demo123');
  console.log('3. quality@demo.tailrd-heart.com (Quality Director) - Password: demo123');
  console.log('\nHospitals Created:');
  console.log('1. TAILRD Demo Hospital (485K patients)');
  console.log('2. TAILRD Demo Hospital 2 (180K patients)');
  console.log('\nSample Data Created:');
  console.log('- 15 Patients with encounters, observations, alerts, and recommendations');
  console.log('- Group B: Phenotypes, Risk Scores, Interventions, Contraindications, Drug Titrations');
  console.log('- Multi-tenant data isolation properly configured');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });


