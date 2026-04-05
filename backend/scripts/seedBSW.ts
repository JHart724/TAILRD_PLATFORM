import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedBSW() {
  console.log('🏥 Creating BSW hospital...');

  const hospital = await prisma.hospital.upsert({
    where: { id: 'bsw' },
    update: {},
    create: {
      id: 'bsw',
      name: 'Baylor Scott & White Health',
      system: 'BSW Health',
      patientCount: 0,
      bedCount: 5765,
      hospitalType: 'ACADEMIC',
      street: '2401 S 31st St',
      city: 'Temple',
      state: 'TX',
      zipCode: '76508',
      redoxIsActive: false,
      moduleHeartFailure: true,
      moduleElectrophysiology: true,
      moduleStructuralHeart: true,
      moduleCoronaryIntervention: true,
      modulePeripheralVascular: true,
      moduleValvularDisease: true,
      subscriptionTier: 'ENTERPRISE',
      subscriptionStart: new Date(),
      subscriptionActive: true,
      maxUsers: 50,
    },
  });
  console.log('✅ Hospital created:', hospital.name);

  const salt = await bcrypt.genSalt(12);
  const demoPassword = process.env.DEMO_PASSWORD || 'Bsw2026!Tailrd';
  const hash = await bcrypt.hash(demoPassword, salt);

  const users = [
    { email: 'bsw-executive@tailrd.demo', firstName: 'BSW', lastName: 'Executive', role: 'QUALITY_DIRECTOR' as const, permExec: true, permSL: false, permCT: false, permManage: false, permExport: false },
    { email: 'bsw-serviceline@tailrd.demo', firstName: 'BSW', lastName: 'Service Line', role: 'QUALITY_DIRECTOR' as const, permExec: true, permSL: true, permCT: false, permManage: false, permExport: false },
    { email: 'bsw-careteam@tailrd.demo', firstName: 'BSW', lastName: 'Care Team', role: 'PHYSICIAN' as const, permExec: true, permSL: true, permCT: true, permManage: false, permExport: false },
    { email: 'bsw-admin@tailrd.demo', firstName: 'BSW', lastName: 'Admin', role: 'HOSPITAL_ADMIN' as const, permExec: true, permSL: true, permCT: true, permManage: true, permExport: true },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        hospitalId: hospital.id,
        permHeartFailure: true,
        permElectrophysiology: true,
        permStructuralHeart: true,
        permCoronaryIntervention: true,
        permPeripheralVascular: true,
        permValvularDisease: true,
        permExecutiveView: u.permExec,
        permServiceLineView: u.permSL,
        permCareTeamView: u.permCT,
        permViewReports: true,
        permExportData: u.permExport,
        permManageUsers: u.permManage,
        isActive: true,
      },
    });
    console.log('✅ User:', u.email, '(' + u.role + ')');
  }
  console.log('🎉 BSW seed complete!');
}

seedBSW().catch(console.error).finally(() => prisma.$disconnect());
