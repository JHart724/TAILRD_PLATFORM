#!/bin/sh
# Phase 2-D Step 3.3 — Apply consolidated baseline to Aurora tailrd_rehearsal_3.
set -eu

echo "[migrate] Fetching Aurora admin from Secrets Manager"
PASSWORD=$(node -e '
const {SecretsManagerClient,GetSecretValueCommand}=require("@aws-sdk/client-secrets-manager");
(async()=>{
  const c=new SecretsManagerClient({region:"us-east-1"});
  const r=await c.send(new GetSecretValueCommand({SecretId:"tailrd-production/app/aurora-db-password"}));
  process.stdout.write(JSON.parse(r.SecretString).password);
})().catch(e=>{console.error(e.message);process.exit(1)})
')
echo "[migrate] Password length=$(echo -n "$PASSWORD" | wc -c)"

AURORA_HOST="tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com"
export DATABASE_URL="postgresql://tailrd_admin:${PASSWORD}@${AURORA_HOST}:5432/tailrd_rehearsal_3?sslmode=require"

echo "[migrate] Target: ${AURORA_HOST} / tailrd_rehearsal_3"
cd /app
npx prisma migrate deploy

echo "[migrate] DONE"
