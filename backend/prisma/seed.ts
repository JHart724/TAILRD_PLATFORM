import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo hospitals
  const stMarysHospital = await prisma.hospital.upsert({
    where: { id: 'hosp-001' },
    update: {},
    create: {
      id: 'hosp-001',
      name: "St. Mary's Regional Medical Center",
      system: 'Catholic Health Network',
      npi: '1234567890',
      patientCount: 485000,
      bedCount: 650,
      hospitalType: 'ACADEMIC',
      street: '123 Medical Center Dr',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
      redoxSourceId: 'stmarys-001',
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

  const communityHospital = await prisma.hospital.upsert({
    where: { id: 'hosp-002' },
    update: {},
    create: {
      id: 'hosp-002',
      name: 'Community General Hospital',
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

  console.log('✅ Created hospitals:', { stMarysHospital: stMarysHospital.id, communityHospital: communityHospital.id });

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('demo123', 12);

  // Create demo users
  const sarahJohnson = await prisma.user.upsert({
    where: { email: 'admin@stmarys.org' },
    update: {},
    create: {
      id: 'user-001',
      email: 'admin@stmarys.org',
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
    where: { email: 'cardio@stmarys.org' },
    update: {},
    create: {
      id: 'user-002',
      email: 'cardio@stmarys.org',
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
    where: { email: 'admin@community.org' },
    update: {},
    create: {
      id: 'user-003',
      email: 'admin@community.org',
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

  // Create sample patients for St. Mary's
  const stMarysPatients = [];
  for (let i = 1; i <= 10; i++) {
    const patient = await prisma.patient.create({
      data: {
        mrn: `SMC${String(i).padStart(6, '0')}`,
        firstName: `Patient${i}`,
        lastName: `StMarys`,
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
    stMarysPatients.push(patient);
  }

  // Create sample patients for Community General
  const communityPatients = [];
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
    communityPatients.push(patient);
  }

  console.log('✅ Created patients:', { 
    stMarysCount: stMarysPatients.length, 
    communityCount: communityPatients.length 
  });

  // Create sample encounters for each patient
  for (const patient of [...stMarysPatients, ...communityPatients]) {
    // Create 1-3 encounters per patient
    const encounterCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < encounterCount; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // Within last 30 days
      
      await prisma.encounter.create({
        data: {
          patientId: patient.id,
          encounterNumber: `ENC${Date.now()}${i}`,
          encounterType: Math.random() > 0.5 ? 'OUTPATIENT' : 'INPATIENT',
          status: 'FINISHED',
          startDateTime: startDate,
          endDateTime: new Date(startDate.getTime() + (Math.random() * 4 * 60 * 60 * 1000)), // 0-4 hours later
          department: 'Cardiology',
          location: patient.hospitalId === 'hosp-001' ? 'St. Mary\'s' : 'Community General',
          attendingProvider: patient.hospitalId === 'hosp-001' ? 'Dr. Michael Chen' : 'Dr. Sarah Martinez',
          chiefComplaint: 'Chest pain',
          primaryDiagnosis: 'Heart failure',
        },
      });
    }
  }

  // Create sample observations (lab results, vitals)
  for (const patient of [...stMarysPatients, ...communityPatients]) {
    // Create some lab results
    await prisma.observation.create({
      data: {
        patientId: patient.id,
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
        patientId: patient.id,
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
    const randomPatient = [...stMarysPatients, ...communityPatients][Math.floor(Math.random() * 15)];
    
    await prisma.alert.create({
      data: {
        patientId: randomPatient.id,
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
    const randomPatient = [...stMarysPatients, ...communityPatients][Math.floor(Math.random() * 15)];
    
    await prisma.recommendation.create({
      data: {
        patientId: randomPatient.id,
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

  console.log('✅ Database seeded successfully!');
  console.log('\n🔐 Demo Users Created:');
  console.log('1. admin@stmarys.org (Hospital Admin) - Password: demo123');
  console.log('2. cardio@stmarys.org (Physician) - Password: demo123');
  console.log('3. admin@community.org (Quality Director) - Password: demo123');
  console.log('\n🏥 Hospitals Created:');
  console.log('1. St. Mary\'s Regional Medical Center (485K patients)');
  console.log('2. Community General Hospital (180K patients)');
  console.log('\n📊 Sample Data Created:');
  console.log('- 15 Patients with encounters, observations, alerts, and recommendations');
  console.log('- Multi-tenant data isolation properly configured');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });