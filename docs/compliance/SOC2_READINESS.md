# TAILRD SOC 2 Type II Readiness Assessment

## Current Status
SOC 2 Type II audit engagement has not been initiated.
This document tracks the controls required for SOC 2 Type II certification.

## Control Categories

### CC1 — Control Environment
- [ ] Security policies formally documented and approved
- [ ] Annual security training for all personnel
- [ ] Background checks for all personnel with system access
- [ ] Vendor risk assessments for AWS, Redox, GitHub
- [x] CLAUDE.md documents engineering security rules

### CC2 — Communication and Information
- [x] Incident response runbook (docs/DISASTER_RECOVERY.md)
- [ ] Security incident communication plan
- [ ] Customer communication templates for breach notification
- [x] BAA register (docs/BAA_REGISTER.md)

### CC3 — Risk Assessment
- [ ] Annual formal risk assessment
- [ ] Threat modeling for TAILRD architecture
- [x] Vulnerability management (GitHub Dependabot enabled)

### CC4 — Monitoring Activities
- [x] CloudWatch alarms (terraform/monitoring.tf)
- [x] VPC Flow Logs (terraform/vpc.tf)
- [x] Audit logging (AuditLog table, auditLogger middleware)
- [ ] SIEM integration
- [ ] Penetration test (annual)

### CC5 — Control Activities
- [x] RBAC with 7 roles
- [x] MFA enforced on all PHI routes
- [x] PHI encryption at rest (AES-256-GCM via Prisma middleware)
- [x] PHI encryption in transit (TLS 1.2+ enforced by ALB)
- [x] Session management with LoginSession table
- [x] Branch protection on main
- [ ] Code signing
- [ ] Formal SDLC policy

### CC6 — Logical and Physical Access
- [x] JWT authentication with HS256 algorithm pinning
- [x] Session token hashing (SHA-256)
- [x] Secrets Manager for all credentials
- [x] SSO/SAML via Cognito (Phase 3)
- [ ] Privileged access workstation policy
- [ ] Access review process (quarterly)

### CC7 — System Operations
- [x] ECS Fargate (no persistent EC2)
- [x] RDS Multi-AZ
- [x] Multi-stage Docker build (no dev dependencies in production)
- [x] Non-root container user
- [ ] Production change management process
- [ ] Capacity management

### CC8 — Change Management
- [x] All changes via PR (branch protection)
- [x] CI/CD pipeline with automated testing
- [x] TypeScript strict mode with no @ts-nocheck bypass
- [ ] Formal change advisory board process
- [ ] Rollback procedures tested quarterly

### CC9 — Risk Mitigation
- [ ] Cyber liability insurance (confirm)
- [x] Disaster recovery plan (docs/DISASTER_RECOVERY.md)
- [ ] Business continuity plan
- [ ] Supplier risk management program

## Recommended Next Steps (Priority Order)

1. Engage SOC 2 audit firm (Vanta, Drata, or Secureframe recommended for SaaS)
2. Complete formal security policies (CC1 gap)
3. Schedule annual penetration test
4. Implement access review process (quarterly)
5. Document SDLC policy
6. Test disaster recovery runbook

## Estimated Timeline to SOC 2 Type II
- Observation period: 6 months minimum
- Audit completion: 2-3 months after observation period ends
- Total: 9-12 months from engagement start

## Last Updated: 2026-04-08
