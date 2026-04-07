# TAILRD Business Associate Agreement Register

| Vendor | PHI Received | BAA Required | BAA Status | Notes |
|--------|-------------|-------------|------------|-------|
| AWS (RDS, S3, ECS, CloudWatch, SES) | Database, files, logs, email | YES | PENDING — accept via AWS Artifact | aws.amazon.com/artifact |
| Redox | Full FHIR bundles | YES | PENDING — contact Redox legal | Required before any EHR connection |
| ElastiCache (AWS) | Potential cached PHI | YES | Covered by AWS umbrella BAA | Confirm with AWS Artifact |
| GitHub | Source code only (no PHI) | NO | N/A | .env excluded via .gitignore |
| CloudFront (AWS) | No PHI (static frontend) | NO | Covered by AWS BAA | |

## Action Items
- [ ] Accept AWS BAA via AWS Artifact console
- [ ] Execute Redox BAA before production EHR connection
- [ ] Verify ElastiCache covered under AWS umbrella BAA
- [ ] Review any additional vendors before adding PHI integrations

Last Updated: 2026-04-07
