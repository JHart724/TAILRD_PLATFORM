// Phase 2-D-TEARDOWN Step 10 — Verify Aurora production tailrd.patients + encounters are empty.
/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const SECRET_NAME = 'tailrd-production/app/aurora-db-password';

async function main() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  const s = JSON.parse(r.SecretString);

  const url = `postgresql://${s.username}:${s.password}@${AURORA_WRITER}:5432/tailrd?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const p = await prisma.$queryRawUnsafe('SELECT count(*)::int AS n FROM patients');
  const e = await prisma.$queryRawUnsafe('SELECT count(*)::int AS n FROM encounters');
  const h = await prisma.$queryRawUnsafe('SELECT count(*)::int AS n FROM hospitals');
  const u = await prisma.$queryRawUnsafe('SELECT count(*)::int AS n FROM users');

  console.log(`AURORA_PRODUCTION_STATE: patients=${p[0].n} encounters=${e[0].n} hospitals=${h[0].n} users=${u[0].n}`);

  await prisma.$disconnect();

  const wave2Ready = p[0].n === 0 && e[0].n === 0;
  if (!wave2Ready) {
    console.error('WAVE2_PREREQ_FAIL: patients or encounters not empty');
    process.exit(1);
  }
  console.log('WAVE2_PREREQ_PASS: patients + encounters empty, DO_NOTHING will work');
}

main().catch((err) => {
  console.error('[verify-empty] FATAL:', err.message);
  process.exit(1);
});
