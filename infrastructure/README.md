# TAILRD Platform — AWS Infrastructure

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────── VPC (10.0.0.0/16) ──────────────────────────┐
│                                                                             │
│  ┌─── Public Subnets (10.0.1.0/24, 10.0.2.0/24) ───┐                      │
│  │  ALB (HTTPS only)    NAT Gateway                  │                      │
│  └──────────────────────────────────────────────────┘                      │
│       │                        │                                            │
│       ▼                        ▼                                            │
│  ┌─── Private Subnets (10.0.10.0/24, 10.0.11.0/24) ─┐                     │
│  │  ECS Tasks (Express backend, port 3001)           │                      │
│  │  → Outbound via NAT only                          │                      │
│  └──────────────────────────────────────────────────┘                      │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─── Database Subnets (10.0.20.0/24, 10.0.21.0/24) ┐                     │
│  │  PostgreSQL (RDS)    Redis (ElastiCache)           │                     │
│  │  → NO internet access                              │                     │
│  └──────────────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## CloudFormation Stacks

| Stack | Template | What it creates |
|-------|----------|-----------------|
| `tailrd-{env}-vpc` | `vpc-network.yaml` | VPC, 6 subnets (public/private/database × 2 AZs), NAT Gateway, security groups, VPC Flow Logs |
| `tailrd-{env}-s3-kms` | `s3-kms.yaml` | 4 S3 buckets (PHI docs, audit exports, app assets, access logs), 2 KMS keys (PHI, S3), bucket policies |
| `tailrd-{env}-waf-cloudtrail` | `waf-cloudtrail.yaml` | WAF Web ACL (6 rules), CloudTrail, CloudWatch log groups, security alarms |

## Deployment

```bash
# Prerequisites: AWS CLI configured with admin credentials
aws configure

# Deploy all stacks
./infrastructure/deploy.sh production 123456789012

# Deploy to staging
./infrastructure/deploy.sh staging 123456789012
```

## IAM Roles

| Role | Policy | Purpose |
|------|--------|---------|
| `tailrd-{env}-app-role` | `app-role-policy.json` | Application servers — S3, KMS, CloudWatch, Secrets Manager |
| `tailrd-{env}-ci-cd-role` | `ci-cd-role-policy.json` | GitHub Actions — ECR push, ECS deploy, S3 artifacts |
| `tailrd-{env}-admin-role` | `admin-role-policy.json` | Platform admins — full S3, KMS mgmt, CloudWatch, read-only RDS |

All roles include explicit Deny statements for destructive actions (key deletion, trail deletion, bucket deletion).

## Security Groups

| SG | Ingress | Egress |
|----|---------|--------|
| ALB | 443 (internet), 80 (redirect) | 3001 → App SG |
| App | 3001 ← ALB SG | 5432 → DB SG, 6379 → Redis SG, 443 → internet (Redox, AWS APIs) |
| Database | 5432 ← App SG | None |
| Redis | 6379 ← App SG | None |

## S3 Buckets

| Bucket | Encryption | Versioning | Retention | Purpose |
|--------|-----------|------------|-----------|---------|
| `tailrd-{env}-phi-documents-{acct}` | KMS (S3 key) | ✅ | 7 years | Patient docs, clinical reports |
| `tailrd-{env}-audit-exports-{acct}` | KMS (S3 key) | ✅ | 7 years | Audit log exports, compliance |
| `tailrd-{env}-app-assets-{acct}` | AES-256 | ✅ | — | Templates, configs, static files |
| `tailrd-{env}-access-logs-{acct}` | AES-256 | ✅ | 1 year | S3 access logs |

All buckets: public access blocked, HTTPS enforced, access logged.

## WAF Rules

1. **AWSManagedRulesCommonRuleSet** — XSS, file inclusion, etc.
2. **AWSManagedRulesKnownBadInputsRuleSet** — Known exploits
3. **AWSManagedRulesSQLiRuleSet** — SQL injection
4. **AWSManagedRulesAmazonIpReputationList** — Malicious IPs
5. **RateLimitPerIP** — 2000 req/5min per IP
6. **BlockOversizedRequests** — >10MB body rejected

## Environment Variables (after deployment)

Copy these from stack outputs to `backend/.env`:

```bash
AWS_REGION=us-east-1
AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi
AWS_KMS_S3_KEY_ID=<from s3-kms stack output>
S3_PHI_BUCKET=tailrd-production-phi-documents-<account-id>
S3_AUDIT_BUCKET=tailrd-production-audit-exports-<account-id>
S3_ASSETS_BUCKET=tailrd-production-app-assets-<account-id>
AWS_CLOUDWATCH_GROUP=/tailrd/production
```
