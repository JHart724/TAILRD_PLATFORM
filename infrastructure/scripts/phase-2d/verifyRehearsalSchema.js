// Phase 2-D Step 3.4 — Verify rehearsal Aurora schema matches production.
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

  const url = `postgresql://${s.username}:${s.password}@${AURORA_WRITER}:5432/${REHEARSAL_DB}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const tables = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`
  );
  console.log(`TABLE_COUNT: ${tables[0].n}`);

  const migrations = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at`
  );
  console.log(`MIGRATIONS_APPLIED: ${migrations.length}`);
  for (const m of migrations) console.log(`  ${m.migration_name}`);

  // Auto-detect Patient and Encounter table naming (Prisma default vs @@map lowercase)
  const tableNames = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND lower(tablename) IN ('patient','encounter','patients','encounters') ORDER BY tablename`
  );
  console.log(`PATIENT_ENCOUNTER_TABLES: ${JSON.stringify(tableNames.map((t) => t.tablename))}`);
  const patientTable = tableNames.find((t) => t.tablename.toLowerCase().startsWith('patient'))?.tablename;
  const encounterTable = tableNames.find((t) => t.tablename.toLowerCase().startsWith('encounter'))?.tablename;
  if (!patientTable || !encounterTable) {
    throw new Error(`Could not find Patient/Encounter tables; found: ${JSON.stringify(tableNames)}`);
  }
  console.log(`Using tables: "${patientTable}", "${encounterTable}"`);

  const uniques = await prisma.$queryRawUnsafe(`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname ILIKE '%fhir%'
    ORDER BY tablename
  `);
  console.log(`FHIR_UNIQUES: ${uniques.length}`);

  const pCount = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${patientTable}"`);
  const eCount = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${encounterTable}"`);
  console.log(`EMPTY_CHECK: {"${patientTable}":${pCount[0].n},"${encounterTable}":${eCount[0].n}}`);

  await prisma.$disconnect();

  const pass = tables[0].n >= 40 && migrations.length >= 1 && pCount[0].n === 0 && eCount[0].n === 0;
  console.log(pass ? 'VERIFICATION_PASS' : 'VERIFICATION_FAIL');
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error('[verify] FATAL:', err.message);
  process.exit(1);
});
