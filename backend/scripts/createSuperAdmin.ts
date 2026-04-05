/**
 * Create Super Admin User
 *
 * Creates or updates a super-admin user for GOD view access.
 * Run with: npx tsx backend/scripts/createSuperAdmin.ts
 *
 * Environment: reads EMAIL and PASSWORD from args or uses defaults.
 *   npx tsx backend/scripts/createSuperAdmin.ts --email admin@tailrd.com --password SecurePass123!
 */

import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { FULL_ACCESS_PERMISSIONS } from '../src/config/rolePermissions';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const emailIdx = process.argv.indexOf('--email');
  const passIdx = process.argv.indexOf('--password');
  const email = emailIdx !== -1 ? process.argv[emailIdx + 1] : 'admin@tailrd.com';
  const password = passIdx !== -1 ? process.argv[passIdx + 1] : 'TailrdAdmin2026!';

  console.log('Creating super-admin user...');

  // Ensure a default hospital exists for the super-admin
  const hospital = await prisma.hospital.upsert({
    where: { id: 'tailrd-platform' },
    create: {
      id: 'tailrd-platform',
      name: 'TAILRD Platform',
      displayName: 'TAILRD',
      ehrSystem: 'Internal',
      subscriptionTier: 'ENTERPRISE',
      subscriptionActive: true,
      enabledModules: ['HEART_FAILURE', 'ELECTROPHYSIOLOGY', 'CORONARY_INTERVENTION', 'STRUCTURAL_HEART', 'VALVULAR_DISEASE', 'PERIPHERAL_VASCULAR'],
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
      role: 'super-admin',
      isActive: true,
      hospitalId: hospital.id,
      ...FULL_ACCESS_PERMISSIONS,
    },
    update: {
      passwordHash,
      isActive: true,
      role: 'super-admin',
    },
  });

  console.log(`Super-admin created:`);
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${email}`);
  console.log(`  Role:  super-admin`);
  console.log(`  Login at /admin/god`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
