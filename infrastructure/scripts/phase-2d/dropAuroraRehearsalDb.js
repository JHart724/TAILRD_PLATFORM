// Phase 2-D-TEARDOWN Step 3 — DROP DATABASE tailrd_rehearsal_3 on Aurora writer.
/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const REHEARSAL_DB = 'tailrd_rehearsal_3';
const SECRET_NAME = 'tailrd-production/app/aurora-db-password';

async function main() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  const s = JSON.parse(r.SecretString);

  const adminUrl = `postgresql://${s.username}:${s.password}@${AURORA_WRITER}:5432/postgres?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });

  const existing = await prisma.$queryRawUnsafe(
    `SELECT 1 AS present FROM pg_database WHERE datname = '${REHEARSAL_DB}'`
  );
  if (!Array.isArray(existing) || existing.length === 0) {
    console.log(`[drop] ${REHEARSAL_DB} not present — already clean`);
    await prisma.$disconnect();
    return;
  }

  // Terminate any lingering connections to the rehearsal DB first
  await prisma.$executeRawUnsafe(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${REHEARSAL_DB}' AND pid <> pg_backend_pid()`
  );

  await prisma.$executeRawUnsafe(`DROP DATABASE ${REHEARSAL_DB}`);
  console.log(`[drop] DROP DATABASE ${REHEARSAL_DB} succeeded`);

  const verify = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM pg_database WHERE datname = '${REHEARSAL_DB}'`
  );
  console.log(`[drop] verify count: ${verify[0].n} (expect 0)`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[drop] FATAL:', err.message);
  process.exit(1);
});
