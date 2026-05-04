// Cleanup: drop the tailrd_rehearsal_3 database that was accidentally created on
// the production RDS source (it has no data; just an empty DB that needs removing).
/* eslint-disable */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const existing = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM pg_database WHERE datname = 'tailrd_rehearsal_3'`
  );
  if (Array.isArray(existing) && existing.length > 0) {
    await prisma.$executeRawUnsafe(`DROP DATABASE tailrd_rehearsal_3`);
    console.log('DROPPED accidental tailrd_rehearsal_3 on RDS source');
  } else {
    console.log('tailrd_rehearsal_3 not present on RDS (already clean)');
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
