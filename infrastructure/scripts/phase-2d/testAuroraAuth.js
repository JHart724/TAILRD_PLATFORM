// Phase 2-D-AUTH-DEBUG — Test Aurora admin auth with raw pg client.
// Isolates Prisma URL parsing from real password drift.
/* eslint-disable */
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const SECRET_NAME = 'tailrd-production/app/aurora-db-password';

async function fetchSecret() {
  const c = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await c.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  return JSON.parse(r.SecretString);
}

function analyze(password) {
  const len = password.length;
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const specials = [...password].filter((c) => /[^A-Za-z0-9]/.test(c));
  const uniqueSpecials = [...new Set(specials)];
  return {
    length: len,
    firstChar: password[0],
    lastChar: password[len - 1],
    hasSpecial,
    specialCharsFound: uniqueSpecials.join(''),
    specialCharCount: specials.length,
  };
}

async function main() {
  console.log('[auth-test] Fetching secret');
  const secret = await fetchSecret();
  const meta = analyze(secret.password);
  console.log('[auth-test] Secret fields:', Object.keys(secret));
  console.log('[auth-test] Username:', secret.username);
  console.log('[auth-test] Password metadata:', JSON.stringify(meta));

  console.log('[auth-test] Connecting with explicit host/user/password (no URL parsing)');
  const client = new Client({
    host: AURORA_WRITER,
    port: 5432,
    user: secret.username,
    password: secret.password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    statement_timeout: 10000,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('[auth-test] Connection opened');
    const r = await client.query('SELECT current_user, current_database(), version() AS version');
    console.log('[auth-test] Query result:', JSON.stringify(r.rows[0]));
    await client.end();
    console.log('AUTH_TEST_PASS');
    process.exit(0);
  } catch (err) {
    console.error('AUTH_TEST_FAIL:', err.message);
    console.error('[auth-test] Error code:', err.code || 'none');
    console.error('[auth-test] Error detail:', err.detail || 'none');
    console.error('[auth-test] Error severity:', err.severity || 'none');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[auth-test] FATAL (outer):', err.message);
  console.error(err.stack);
  process.exit(1);
});
