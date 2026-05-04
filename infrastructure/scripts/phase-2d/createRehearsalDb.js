// Phase 2-D Step 3.2 — CREATE DATABASE tailrd_rehearsal_3 on Aurora writer.
// Fetches Aurora admin from Secrets Manager (NOT DATABASE_URL — that points at RDS).
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
  if (Array.isArray(existing) && existing.length > 0) {
    console.error(`[createRehearsalDb] FATAL: ${REHEARSAL_DB} already exists on Aurora`);
    await prisma.$disconnect();
    process.exit(2);
  }

  await prisma.$executeRawUnsafe(`CREATE DATABASE ${REHEARSAL_DB}`);
  console.log(`[createRehearsalDb] CREATE DATABASE ${REHEARSAL_DB} on Aurora succeeded`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[createRehearsalDb] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
