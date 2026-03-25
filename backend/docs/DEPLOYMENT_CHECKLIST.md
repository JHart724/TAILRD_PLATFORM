# TAILRD Phase 1 Deployment Checklist

## Pre-deployment
- [ ] Generate JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Configure AWS credentials (IAM user with S3 access)
- [ ] Provision PostgreSQL instance (RDS recommended)
- [ ] Provision Redis instance (ElastiCache recommended)
- [ ] Set all required environment variables

## Database Setup
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Run BSW seed: `npx ts-node scripts/seedBSW.ts`
- [ ] Verify seed: check Hospital and User tables

## Application
- [ ] Build: `npm run build`
- [ ] Start: `npm start`
- [ ] Verify: `curl https://api.domain/api/status`

## Verification
- [ ] Login as bsw-admin@tailrd.demo
- [ ] Upload sample CSV file
- [ ] Verify gap detection fires
- [ ] Verify audit logs recorded
- [ ] Login as bsw-executive@tailrd.demo
- [ ] Verify executive-only view access
- [ ] Send test invite
- [ ] Accept invite and set password

## Security
- [ ] Confirm DEMO_MODE=false in production
- [ ] Confirm JWT_SECRET is unique and secure
- [ ] Confirm CORS allows only production domain
- [ ] Confirm HTTPS enforced
- [ ] Verify audit logs capturing all events
