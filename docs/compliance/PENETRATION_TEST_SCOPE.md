# TAILRD Penetration Test Scope Document

## Scope

### In Scope
- API endpoints: https://api.tailrd-heart.com
- Frontend application: https://app.tailrd-heart.com
- Authentication flows (login, MFA, SSO/SAML, token refresh)
- Authorization controls (RBAC, multi-tenancy isolation)
- API input validation and injection vulnerabilities
- Session management
- CSRF protections
- CDS Hooks endpoints (/cds-services)
- SMART on FHIR launch flow

### Out of Scope
- AWS infrastructure (covered by AWS Shared Responsibility Model)
- Third-party services (Redox, Cognito)
- Physical security
- Denial of service testing

### Testing Methodology
- OWASP Top 10 (2021)
- SANS Top 25
- FHIR security audit per HL7 Security WG guidelines
- Healthcare-specific: PHI exfiltration scenarios, tenant isolation bypass, audit log tampering

### Rules of Engagement
- No production data exfiltration
- No destructive testing
- Testing window: coordinate with engineering team
- Findings to be reported within 5 business days
- Critical findings reported immediately via secure channel

### Key Areas of Focus
1. Multi-tenancy isolation: can Hospital A access Hospital B's patient data?
2. RBAC bypass: can a VIEWER role escalate to HOSPITAL_ADMIN?
3. PHI exposure: are patient names/MRNs/DOBs ever in logs, error messages, or API responses to unauthorized users?
4. Session management: can a logged-out user's token still access endpoints?
5. CDS Hooks JWT: can a forged CDS Hooks request access patient data?
6. SSO/SAML: can SAML assertion replay grant unauthorized access?

## Last Updated: 2026-04-08
