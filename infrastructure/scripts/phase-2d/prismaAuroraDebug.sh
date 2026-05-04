#!/bin/sh
# Phase 2-D-AUTH-ROOT-CAUSE — Prisma Aurora auth diagnostic.
# set -u only (no -e) because we want the diagnostic to continue past individual failures.
set -u

echo "============================================================"
echo "Prisma + engine versions"
echo "============================================================"
cd /app
npx prisma --version 2>&1 | grep -E "prisma|Engine|Node" || true

echo ""
echo "============================================================"
echo "FETCHING Aurora admin password from Secrets Manager"
echo "============================================================"
export PASSWORD=$(node -e '
const {SecretsManagerClient,GetSecretValueCommand}=require("@aws-sdk/client-secrets-manager");
(async()=>{
  const c=new SecretsManagerClient({region:"us-east-1"});
  const r=await c.send(new GetSecretValueCommand({SecretId:"tailrd-production/app/aurora-db-password"}));
  process.stdout.write(JSON.parse(r.SecretString).password);
})().catch(e=>{console.error(e.message);process.exit(1)})
')
echo "Password fetched (length=$(echo -n "$PASSWORD" | wc -c))"

export AURORA_HOST="tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com"

echo ""
echo "============================================================"
echo "Aurora settings via pg (proven working)"
echo "============================================================"
node -e '
const {Client}=require("pg");
(async()=>{
  const c=new Client({host:process.env.AURORA_HOST,port:5432,user:"tailrd_admin",password:process.env.PASSWORD,database:"postgres",ssl:{rejectUnauthorized:false}});
  await c.connect();
  const a=await c.query("SELECT name,setting FROM pg_settings WHERE name IN (\x27password_encryption\x27,\x27ssl\x27,\x27ssl_min_protocol_version\x27,\x27server_version\x27)");
  console.log("pg_settings:");
  for(const r of a.rows) console.log(`  ${r.name} = ${r.setting}`);
  await c.end();
})().catch(e=>{console.error("pg-aux FAIL:",e.message)})
'

echo ""
echo "============================================================"
echo "TEST A — Prisma, sslmode=require, no other params"
echo "============================================================"
export DATABASE_URL="postgresql://tailrd_admin:${PASSWORD}@${AURORA_HOST}:5432/postgres?sslmode=require"
node -e '
const {PrismaClient}=require("@prisma/client");
const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}},log:["query","info","warn","error"]});
p.$queryRaw`SELECT current_user AS u, current_database() AS d`
  .then(r=>{console.log("TEST_A_OK:",JSON.stringify(r));process.exit(0)})
  .catch(e=>{console.error("TEST_A_FAIL:",e.message);console.error("  code=",e.code||"none");console.error("  meta=",JSON.stringify(e.meta||{}));process.exit(1)})
' 2>&1 || true

echo ""
echo "============================================================"
echo "TEST B — Prisma, URL-encoded password"
echo "============================================================"
PASSWORD_ENC=$(node -e 'process.stdout.write(encodeURIComponent(process.env.PASSWORD))')
export DATABASE_URL="postgresql://tailrd_admin:${PASSWORD_ENC}@${AURORA_HOST}:5432/postgres?sslmode=require"
node -e '
const {PrismaClient}=require("@prisma/client");
const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});
p.$queryRaw`SELECT 1 AS ok`.then(r=>{console.log("TEST_B_OK:",JSON.stringify(r));process.exit(0)}).catch(e=>{console.error("TEST_B_FAIL:",e.message.split("\n")[0]);process.exit(1)})
' 2>&1 | tail -5 || true

echo ""
echo "============================================================"
echo "TEST C — Prisma, channel_binding=disable"
echo "============================================================"
export DATABASE_URL="postgresql://tailrd_admin:${PASSWORD}@${AURORA_HOST}:5432/postgres?sslmode=require&channel_binding=disable"
node -e '
const {PrismaClient}=require("@prisma/client");
const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});
p.$queryRaw`SELECT 1 AS ok`.then(r=>{console.log("TEST_C_OK:",JSON.stringify(r));process.exit(0)}).catch(e=>{console.error("TEST_C_FAIL:",e.message.split("\n")[0]);process.exit(1)})
' 2>&1 | tail -5 || true

echo ""
echo "============================================================"
echo "TEST D — sslmode variants"
echo "============================================================"
for MODE in require prefer verify-ca; do
  export DATABASE_URL="postgresql://tailrd_admin:${PASSWORD}@${AURORA_HOST}:5432/postgres?sslmode=${MODE}"
  RESULT=$(node -e "
    const {PrismaClient}=require(\"@prisma/client\");
    const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});
    p.\$queryRaw\`SELECT 1\`.then(()=>{console.log(\"OK\");process.exit(0)}).catch(e=>{console.error(\"FAIL:\"+e.message.split(\"\\n\")[0]);process.exit(1)})
  " 2>&1 | tail -1 || true)
  echo "  sslmode=${MODE} -> ${RESULT}"
done

echo ""
echo "============================================================"
echo "TEST E — Prisma schema-engine (migrate) path, sslmode=require"
echo "============================================================"
export DATABASE_URL="postgresql://tailrd_admin:${PASSWORD}@${AURORA_HOST}:5432/postgres?sslmode=require"
# Use schema-engine directly to see if migrate path differs from query-engine path
echo 'SELECT 1;' | npx prisma db execute --stdin --url "$DATABASE_URL" 2>&1 | tail -8 || true

echo ""
echo "============================================================"
echo "TEST F — pg (baseline — should PASS to confirm creds)"
echo "============================================================"
node -e '
const {Client}=require("pg");
(async()=>{
  const c=new Client({host:process.env.AURORA_HOST,port:5432,user:"tailrd_admin",password:process.env.PASSWORD,database:"postgres",ssl:{rejectUnauthorized:false}});
  await c.connect();
  const r=await c.query("SELECT current_user AS u");
  console.log("TEST_F_OK:",JSON.stringify(r.rows[0]));
  await c.end();
})().catch(e=>{console.error("TEST_F_FAIL:",e.message);process.exit(1)})
'

echo ""
echo "DIAGNOSTIC COMPLETE"
