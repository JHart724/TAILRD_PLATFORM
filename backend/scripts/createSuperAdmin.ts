/**
 * Create Super Admin User
 *
 * Creates or updates a super-admin user for GOD view access.
 * Run with: npx tsx backend/scripts/createSuperAdmin.ts
 *
 * Environment: email defaults to admin@tailrd.com; the PASSWORD has NO default and must come from
 * --password or SUPER_ADMIN_PASSWORD.
 *   SUPER_ADMIN_PASSWORD='<chosen>' npx tsx backend/scripts/createSuperAdmin.ts --email admin@tailrd.com
 *   (or pass --password explicitly). There is NO default password - see AUDIT-236.
 */

import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { requiredSecret } from '../src/lib/requiredSecret';
// Permission fields set explicitly in upsert — matches seed.ts pattern
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const emailIdx = process.argv.indexOf('--email');
  const passIdx = process.argv.indexOf('--password');
  const email = emailIdx !== -1 ? process.argv[emailIdx + 1] : 'admin@tailrd.com';
  // AUDIT-236: the default was `'TailrdAdmin2026!'`. `docs/PLATFORM_AUDIT_2026_04.md:119` records
  // P2-AUTH-2 as `[x]` complete against this file naming the OLD literal `'demo123!'` - so the
  // 2026-04 remediation CHANGED the literal rather than removing it, and the finding closed while
  // the class survived by substitution. That is the reason this helper has no fallback parameter
  // and the reason `noDefaultCredentials.test.ts` exists. This script creates a SUPER_ADMIN on
  // `tailrd-platform` - the most privileged principal on the platform - so a default here is the
  // worst instance of the three.
  const password =
    passIdx !== -1
      ? process.argv[passIdx + 1]
      : requiredSecret(
          'SUPER_ADMIN_PASSWORD',
          'Creates/updates a SUPER_ADMIN on tailrd-platform. Pass --password to override.',
        );

  console.log('Creating super-admin user...');

  // Ensure a default hospital exists for the super-admin
  const hospital = await prisma.hospital.upsert({
    where: { id: 'tailrd-platform' },
    create: {
      id: 'tailrd-platform',
      name: 'TAILRD Platform',
      patientCount: 0,
      bedCount: 0,
      hospitalType: 'ACADEMIC',
      street: 'N/A',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
      country: 'USA',
      moduleHeartFailure: true,
      moduleElectrophysiology: true,
      moduleStructuralHeart: true,
      moduleCoronaryIntervention: true,
      modulePeripheralVascular: true,
      moduleValvularDisease: true,
      subscriptionTier: 'ENTERPRISE',
      subscriptionStart: new Date(),
      subscriptionActive: true,
      maxUsers: 100,
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
      hospitalId: hospital.id,
      permHeartFailure: true,
      permElectrophysiology: true,
      permStructuralHeart: true,
      permCoronaryIntervention: true,
      permPeripheralVascular: true,
      permValvularDisease: true,
      permExecutiveView: true,
      permServiceLineView: true,
      permCareTeamView: true,
      permViewReports: true,
      permExportData: true,
      permManageUsers: true,
      permConfigureAlerts: true,
      permAccessPHI: true,
    },
    update: {
      passwordHash,
      isActive: true,
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`Super-admin created:`);
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${email}`);
  console.log(`  Role:  SUPER_ADMIN`);
  console.log(`  Login at /admin/god`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
