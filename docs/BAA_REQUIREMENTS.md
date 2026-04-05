# Business Associate Agreement (BAA) Requirements

HIPAA requires a BAA with every third party that receives, stores, processes,
or transmits Protected Health Information (PHI) on behalf of TAILRD.

## Services Requiring BAAs

| Service | Provider | PHI Exposure | BAA Status |
|---------|----------|-------------|------------|
| PostgreSQL hosting | TBD (RDS / Railway / Render) | All patient data at rest | REQUIRED before deployment |
| AWS S3 | Amazon Web Services | PHI documents, FHIR bundles, audit logs | AWS BAA available via AWS Artifact |
| AWS KMS | Amazon Web Services | Encryption key management for PHI | Covered by AWS BAA |
| AWS SES | Amazon Web Services | Email addresses in invite/password flows | Covered by AWS BAA |
| AWS CloudWatch | Amazon Web Services | Log data (PHI redacted but may leak) | Covered by AWS BAA |
| Redox | Redox Inc. | Full EHR data (FHIR R4 bundles) | REQUIRED -- Redox provides BAA |
| Log aggregation | TBD (Datadog / Splunk) | Logs may contain PHI if redaction fails | REQUIRED if PHI in logs |
| Email provider | TBD (SendGrid / SES) | Patient-related notifications | REQUIRED if patient data in emails |

## AWS BAA

AWS offers a BAA through AWS Artifact. Steps:
1. Log in to AWS Management Console
2. Navigate to AWS Artifact > Agreements
3. Accept the AWS Business Associate Addendum (BAA)
4. This covers S3, KMS, SES, CloudWatch, RDS, and other eligible services

## Redox BAA

Redox provides standard BAAs for all integration partners.
Contact: compliance@redoxengine.com

## Before First Deployment

- [ ] Sign AWS BAA via AWS Artifact
- [ ] Sign Redox BAA
- [ ] Select and sign BAA with PostgreSQL hosting provider
- [ ] Verify PHI log redaction is complete (P1-HIPAA-1, P1-HIPAA-2 done)
- [ ] Confirm no PHI flows to services without BAAs
