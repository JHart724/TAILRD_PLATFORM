# TAILRD — Remediation Sprint Regression Protection Protocol
# Version 1.0 | April 2026
# Save to: docs/REGRESSION_PROTECTION.md

---

## WHY THIS DOCUMENT EXISTS

The Phase 1 audit returned 121 findings including 14 CRITICAL and 50 HIGH severity issues.
Fixing 64 high-severity issues in a short sprint with a small team is exactly when
working functionality gets broken. The platform has confirmed-working systems that must
be protected: auth flow, 5 runtime gap rules, PDF/Excel export, Redox HMAC validation,
PHI encryption on the Patient model, CORS configuration, and the frosted glass frontend.

This document defines the exact process every fix must follow. No exceptions.

---

## STEP 1 — SNAPSHOT EVERYTHING BEFORE TOUCHING ANYTHING

Run these commands once before the first fix. This creates a recoverable baseline.

```bash
# Tag the last known working commit
git tag pre-remediation-baseline-$(date +%Y%m%d)
git push origin --tags

# Export current database schema exactly as-is
pg_dump $DATABASE_URL --schema-only \
  > docs/schema_baseline_$(date +%Y%m%d).sql

# Export demo seed data (hospitals, users only — no PHI)
pg_dump $DATABASE_URL --data-only \
  --table=Hospital \
  --table=User \
  --table=HospitalModule \
  > docs/seed_baseline_$(date +%Y%m%d).sql

# Capture API health baseline
curl -s http://localhost:3001/api/health \
  > docs/health_baseline_$(date +%Y%m%d).json

# Capture currently passing smoke tests
npm test -- --testPathPattern=smoke \
  > docs/smoke_baseline_$(date +%Y%m%d).txt 2>&1

echo "Baseline captured. Tag: pre-remediation-baseline-$(date +%Y%m%d)"
```

**If anything goes wrong at any point during the sprint:**

```bash
# Restore to baseline
git checkout pre-remediation-baseline-$(date +%Y%m%d)

# Restore database
psql $DATABASE_URL < docs/schema_baseline_YYYYMMDD.sql
```

---

## STEP 2 — SMOKE TEST SUITE

**Save to: `tests/smoke/regression.test.ts`**

This is not a full test suite. It is a targeted regression guard covering exactly the
systems the audit touched. Run it before every fix. Run it after every fix.
If anything goes red that was green before — stop, do not merge, investigate.

```typescript
import request from 'supertest';
import { prisma } from '../../backend/lib/prisma';
import app from '../../backend/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

const TEST_HOSPITAL_A_ID = process.env.TEST_HOSPITAL_A_ID!;
const TEST_HOSPITAL_B_ID = process.env.TEST_HOSPITAL_B_ID!;
const JWT_SECRET = process.env.JWT_SECRET!;

const makeToken = (overrides: Record<string, unknown> = {}) =>
  jwt.sign(
    {
      userId: 'test-user-id',
      email: 'test@tailrd-heart.com',
      role: 'care-team',
      hospitalId: TEST_HOSPITAL_A_ID,
      mfaVerified: true,
      ...overrides,
    },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

// ─────────────────────────────────────────────────────────────
// SECTION 1: AUTH FLOW REGRESSION
// Protects: auth.ts, middleware/auth.ts
// Risks from: session hash fix, MFA LoginSession fix,
//             JWT algorithm pinning, refresh token rotation
// ─────────────────────────────────────────────────────────────

describe('AUTH REGRESSION — must all pass before and after every auth fix', () => {

  it('POST /api/auth/login returns 200 with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });

  it('POST /api/auth/login returns 401 with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('GET /api/patients returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('GET /api/patients returns 200 with valid JWT', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('Expired JWT returns 401', async () => {
    const expiredToken = jwt.sign(
      { userId: 'test', role: 'care-team', hospitalId: TEST_HOSPITAL_A_ID },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('Token signed with wrong algorithm returns 401', async () => {
    // Attempt algorithm confusion attack — none algorithm
    const noneToken = jwt.sign(
      { userId: 'test', role: 'super-admin', hospitalId: TEST_HOSPITAL_A_ID },
      '',
      { algorithm: 'none' as any }
    );
    const res = await request(app)
      .get('/api/admin/hospitals')
      .set('Authorization', `Bearer ${noneToken}`);
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout invalidates session — old token returns 401 on next request', async () => {
    // Login to get a real token and session
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD });
    const token = loginRes.body.token;

    // Verify token works before logout
    const beforeLogout = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(beforeLogout.status).toBe(200);

    // Logout
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // Verify token no longer works after logout
    const afterLogout = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(afterLogout.status).toBe(401);
  });

  it('POST /api/auth/mfa/verify creates LoginSession and returns complete token', async () => {
    // This test validates the MFA LoginSession fix (SEC-C4)
    // A token returned after MFA verification must have mfaVerified: true
    // and a corresponding LoginSession must exist in the database
    const res = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ token: process.env.TEST_MFA_TOKEN, preAuthToken: process.env.TEST_PRE_AUTH_TOKEN });
    
    if (res.status === 200) {
      // Verify token contains expected claims
      const decoded = jwt.decode(res.body.token) as Record<string, unknown>;
      expect(decoded).toHaveProperty('mfaVerified', true);
      expect(decoded).toHaveProperty('hospitalId');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('email');

      // Verify LoginSession was created in database
      const session = await prisma.loginSession.findFirst({
        where: { userId: decoded.userId as string, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(session).not.toBeNull();
      expect(session?.isActive).toBe(true);
    }
  });

  it('Refresh token rotation — original refresh token rejected after rotation', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD });
    const originalRefreshToken = loginRes.body.refreshToken;
    if (!originalRefreshToken) return; // Skip if refresh tokens not implemented

    // Rotate the refresh token
    const rotateRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefreshToken });
    expect(rotateRes.status).toBe(200);

    // Original refresh token must now be rejected
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefreshToken });
    expect(replayRes.status).toBe(401);
  });

});

// ─────────────────────────────────────────────────────────────
// SECTION 2: RBAC & MASS ASSIGNMENT REGRESSION
// Protects: admin.ts routes, role enforcement middleware
// Risks from: mass assignment fix (SEC-C3), role check fixes
// ─────────────────────────────────────────────────────────────

describe('RBAC REGRESSION — must all pass before and after every admin/role fix', () => {

  it('PUT /api/admin/users/:id cannot elevate role to SUPER_ADMIN', async () => {
    const adminToken = makeToken({ role: 'hospital-admin' });
    const res = await request(app)
      .put('/api/admin/users/test-user-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SUPER_ADMIN' });
    // Must not succeed — either 400 (rejected field) or 403 (unauthorized)
    expect([400, 403, 422]).toContain(res.status);
    // Verify role was not changed in database
    const user = await prisma.user.findUnique({ where: { id: 'test-user-id' } });
    expect(user?.role).not.toBe('SUPER_ADMIN');
  });

  it('PUT /api/admin/users/:id cannot change hospitalId to another tenant', async () => {
    const adminToken = makeToken({ role: 'hospital-admin', hospitalId: TEST_HOSPITAL_A_ID });
    const res = await request(app)
      .put('/api/admin/users/test-user-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ hospitalId: TEST_HOSPITAL_B_ID });
    expect([400, 403, 422]).toContain(res.status);
  });

  it('PUT /api/admin/users/:id cannot set isVerified or passwordHash directly', async () => {
    const adminToken = makeToken({ role: 'hospital-admin' });
    const res = await request(app)
      .put('/api/admin/users/test-user-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true, passwordHash: 'fakehash', isActive: true });
    // Accepted fields should pass; sensitive fields should be stripped
    const user = await prisma.user.findUnique({ where: { id: 'test-user-id' } });
    expect(user?.passwordHash).not.toBe('fakehash');
  });

  it('Care team role cannot reach admin routes', async () => {
    const careTeamToken = makeToken({ role: 'care-team' });
    const res = await request(app)
      .get('/api/admin/hospitals')
      .set('Authorization', `Bearer ${careTeamToken}`);
    expect(res.status).toBe(403);
  });

  it('Hospital admin cannot reach super-admin GOD view routes', async () => {
    const adminToken = makeToken({ role: 'hospital-admin' });
    const res = await request(app)
      .get('/api/admin/god/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('Super admin role string is correctly matched (case sensitivity)', async () => {
    // The audit found role case mismatch: 'SUPER_ADMIN' vs 'super-admin'
    // This test verifies whichever format is correct actually works
    const superAdminToken = makeToken({ role: 'super-admin' });
    const res = await request(app)
      .get('/api/admin/god/overview')
      .set('Authorization', `Bearer ${superAdminToken}`);
    // Should be 200 (or 500 if backend mock — not 403)
    expect(res.status).not.toBe(403);
  });

});

// ─────────────────────────────────────────────────────────────
// SECTION 3: MULTI-TENANCY REGRESSION
// Protects: all patient/clinical routes
// Risks from: hospitalId scoping fixes, IDOR patches
// ─────────────────────────────────────────────────────────────

describe('MULTI-TENANCY REGRESSION — must pass before and after every tenant isolation fix', () => {

  it('Hospital A token cannot read Hospital B patients', async () => {
    const hospitalAToken = makeToken({ hospitalId: TEST_HOSPITAL_A_ID });
    // Get a patient ID that belongs to Hospital B
    const hospitalBPatient = await prisma.patient.findFirst({
      where: { hospitalId: TEST_HOSPITAL_B_ID },
      select: { id: true },
    });
    if (!hospitalBPatient) return; // Skip if no Hospital B patients in test DB

    const res = await request(app)
      .get(`/api/patients/${hospitalBPatient.id}`)
      .set('Authorization', `Bearer ${hospitalAToken}`);
    // Must return 404 (not 200 with Hospital B data)
    expect(res.status).toBe(404);
    expect(res.body?.hospitalId).not.toBe(TEST_HOSPITAL_B_ID);
  });

  it('Hospital A token cannot PATCH Hospital B clinical intelligence records', async () => {
    const hospitalAToken = makeToken({ hospitalId: TEST_HOSPITAL_A_ID });
    const hospitalBPatient = await prisma.patient.findFirst({
      where: { hospitalId: TEST_HOSPITAL_B_ID },
      select: { id: true },
    });
    if (!hospitalBPatient) return;

    const res = await request(app)
      .patch(`/api/clinical-intelligence/patients/${hospitalBPatient.id}/interventions`)
      .set('Authorization', `Bearer ${hospitalAToken}`)
      .send({ status: 'completed' });
    expect([403, 404]).toContain(res.status);
  });

  it('GOD view global search returns 403 for non-super-admin', async () => {
    const adminToken = makeToken({ role: 'hospital-admin' });
    const res = await request(app)
      .get('/api/admin/god/search?q=Johnson')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('GOD view global search does NOT expose PHI across tenants to hospital-admin', async () => {
    const hospitalAToken = makeToken({ role: 'hospital-admin', hospitalId: TEST_HOSPITAL_A_ID });
    const res = await request(app)
      .get('/api/admin/god/search?q=test')
      .set('Authorization', `Bearer ${hospitalAToken}`);
    // Either 403 (no access) or results scoped to Hospital A only
    if (res.status === 200) {
      const patients = res.body?.patients || [];
      patients.forEach((p: { hospitalId: string }) => {
        expect(p.hospitalId).toBe(TEST_HOSPITAL_A_ID);
      });
    }
  });

  it('Patient list for Hospital A does not include Hospital B patients', async () => {
    const hospitalAToken = makeToken({ hospitalId: TEST_HOSPITAL_A_ID });
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${hospitalAToken}`);
    expect(res.status).toBe(200);
    const patients = res.body?.patients || res.body?.data || [];
    patients.forEach((p: { hospitalId: string }) => {
      expect(p.hospitalId).toBe(TEST_HOSPITAL_A_ID);
    });
  });

});

// ─────────────────────────────────────────────────────────────
// SECTION 4: CLINICAL GAP RULE REGRESSION
// Protects: gapDetectionRunner.ts — the 5 working runtime rules
// Risks from: drug code fixes, finerenone fix, ferritin/troponin fix,
//             gender/race field fix, sex-specific QTc threshold fix
// ─────────────────────────────────────────────────────────────

describe('GAP RULE REGRESSION — must pass before and after every clinical logic fix', () => {

  it('Iron deficiency gap fires for HFrEF patient with ferritin < 100', async () => {
    const token = makeToken();
    // Assumes test patient ICD-10384 is seeded with: HFrEF + ferritin 45 ng/mL + no IV iron
    const res = await request(app)
      .get('/api/gaps/heart-failure/patient/ICD-10384')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const ironGap = gaps.find((g: { id: string }) => g.id === 'hf-iron-deficiency');
    expect(ironGap).toBeDefined();
  });

  it('Iron deficiency gap does NOT fire for HFrEF patient with ferritin > 100 + transferrin sat > 20%', async () => {
    const token = makeToken();
    // Assumes test patient ICD-10385 is seeded with: HFrEF + ferritin 150 ng/mL + transferrin 25%
    const res = await request(app)
      .get('/api/gaps/heart-failure/patient/ICD-10385')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const ironGap = gaps.find((g: { id: string }) => g.id === 'hf-iron-deficiency');
    expect(ironGap).toBeUndefined();
  });

  it('QTc gap fires for FEMALE patient with QTc > 470ms', async () => {
    const token = makeToken();
    // Assumes test patient EP-001 is seeded with: female + QTc 485ms + on antiarrhythmic
    const res = await request(app)
      .get('/api/gaps/electrophysiology/patient/EP-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const qtcGap = gaps.find((g: { id: string }) => g.id === 'ep-qtc-prolongation');
    expect(qtcGap).toBeDefined();
  });

  it('QTc gap fires for MALE patient with QTc > 450ms (sex-specific threshold)', async () => {
    const token = makeToken();
    // Assumes test patient EP-002 is seeded with: male + QTc 460ms + on antiarrhythmic
    // This tests the sex-specific threshold fix — old code used 470ms for all genders
    const res = await request(app)
      .get('/api/gaps/electrophysiology/patient/EP-002')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const qtcGap = gaps.find((g: { id: string }) => g.id === 'ep-qtc-prolongation');
    expect(qtcGap).toBeDefined();
  });

  it('QTc gap does NOT fire for female patient with QTc = 460ms (below female threshold)', async () => {
    const token = makeToken();
    // Assumes test patient EP-003: female + QTc 460ms (below female 470ms threshold)
    const res = await request(app)
      .get('/api/gaps/electrophysiology/patient/EP-003')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const qtcGap = gaps.find((g: { id: string }) => g.id === 'ep-qtc-prolongation');
    expect(qtcGap).toBeUndefined();
  });

  it('Digoxin toxicity gap fires for patient age >= 75 + eGFR < 50 + on digoxin', async () => {
    const token = makeToken();
    // Assumes test patient HF-DIG-001: age 78 + eGFR 42 + active digoxin
    const res = await request(app)
      .get('/api/gaps/heart-failure/patient/HF-DIG-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const digoxinGap = gaps.find((g: { id: string }) => g.id === 'hf-digoxin-toxicity');
    expect(digoxinGap).toBeDefined();
  });

  it('Finerenone gap requires diabetes — does NOT fire without T2DM diagnosis', async () => {
    // Tests the finerenone indication fix (was recommending for HF without diabetes)
    const token = makeToken();
    // Assumes test patient HF-FINE-001: HFrEF + CKD but NO diabetes
    const res = await request(app)
      .get('/api/gaps/heart-failure/patient/HF-FINE-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const finerenoneGap = gaps.find((g: { id: string }) => g.id === 'hf-finerenone');
    expect(finerenoneGap).toBeUndefined();
  });

  it('Hydralazine-ISDN gap fires for Black/African American patient with HFrEF (A-HeFT rule)', async () => {
    // Tests the gender=BLACK race/gender field confusion fix
    // Before fix: race parameter was silently dropped — rule never fired
    // After fix: rule fires correctly for patients with race = Black/African American
    const token = makeToken();
    // Assumes test patient HF-AHEFT-001: Black/AA race + HFrEF (EF 30%) + on RAAS
    const res = await request(app)
      .get('/api/gaps/heart-failure/patient/HF-AHEFT-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const aheftGap = gaps.find((g: { id: string }) => g.id === 'hf-hydralazine-isdn');
    expect(aheftGap).toBeDefined();
  });

  it('Hydralazine-ISDN gap does NOT fire for non-Black patient with HFrEF', async () => {
    const token = makeToken();
    // Assumes test patient HF-AHEFT-002: White race + HFrEF
    const res = await request(app)
      .get('/api/gaps/heart-failure/patient/HF-AHEFT-002')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const aheftGap = gaps.find((g: { id: string }) => g.id === 'hf-hydralazine-isdn');
    expect(aheftGap).toBeUndefined();
  });

  it('ATTR-CM gap does NOT use ferritin as troponin proxy', async () => {
    // Tests the ferritin/troponin fix
    // Patient with elevated ferritin (iron overload) but normal troponin should NOT trigger ATTR-CM
    const token = makeToken();
    // Assumes test patient HF-ATTR-001: high ferritin (350) but troponin normal
    const res = await request(app)
      .get('/api/gaps/heart-failure/patient/HF-ATTR-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const gaps = res.body?.gaps || [];
    const attrGap = gaps.find((g: { id: string }) => g.id === 'hf-attr-cm');
    expect(attrGap).toBeUndefined();
  });

});

// ─────────────────────────────────────────────────────────────
// SECTION 5: PHI ENCRYPTION REGRESSION
// Protects: phiEncryption.ts, PrismaClient singleton
// Risks from: encryption expansion to new models, new PrismaClient instances
// ─────────────────────────────────────────────────────────────

describe('PHI ENCRYPTION REGRESSION — must pass before and after every encryption fix', () => {

  it('Patient firstName is encrypted at rest (not plaintext in raw DB query)', async () => {
    // Bypass the Prisma middleware by querying raw to check actual stored value
    const patient = await prisma.patient.findFirst({
      select: { id: true },
    });
    if (!patient) return;

    const rawResult = await prisma.$queryRaw<Array<{ first_name: string }>>`
      SELECT first_name FROM "Patient" WHERE id = ${patient.id} LIMIT 1
    `;
    // The raw stored value must NOT be a plaintext name
    // It should be a Base64 or hex-encoded encrypted string
    const storedValue = rawResult[0]?.first_name;
    expect(storedValue).not.toMatch(/^[A-Z][a-z]+$/); // Not a plaintext name like "Mary"
    expect(storedValue?.length).toBeGreaterThan(20);   // Encrypted values are longer
  });

  it('Prisma findUnique on Patient returns decrypted firstName', async () => {
    // The middleware should decrypt transparently — ORM-level reads must return plaintext
    const patient = await prisma.patient.findFirst();
    if (!patient) return;
    // The decrypted firstName should look like a name, not a cipher
    expect(patient.firstName).toMatch(/^[A-Za-z\s'\-]+$/);
  });

  it('All PrismaClient consumers use the shared PHI-encrypting singleton', async () => {
    // This is a static analysis check — verify no rogue new PrismaClient() exist
    // Run as part of CI: grep -r "new PrismaClient()" --include="*.ts" backend/
    const { execSync } = require('child_process');
    const result = execSync(
      'grep -r "new PrismaClient()" --include="*.ts" backend/ | grep -v "lib/prisma.ts" | wc -l'
    ).toString().trim();
    expect(parseInt(result)).toBe(0);
  });

});

// ─────────────────────────────────────────────────────────────
// SECTION 6: DEMO HAPPY PATH REGRESSION
// Protects: the end-to-end demo flow for Mount Sinai / Medical City Dallas
// Risks from: any frontend or API change
// ─────────────────────────────────────────────────────────────

describe('DEMO HAPPY PATH REGRESSION — must pass before every health system demo', () => {

  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/gaps/heart-failure returns module gap data', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/gaps/heart-failure')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('moduleId', 'heart-failure');
  });

  it('GET /api/gaps/electrophysiology returns module gap data', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/gaps/electrophysiology')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/gaps/coronary returns module gap data', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/gaps/coronary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/gaps/structural-heart returns module gap data', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/gaps/structural-heart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/gaps/valvular returns module gap data', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/gaps/valvular')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/gaps/peripheral-vascular returns module gap data', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/gaps/peripheral-vascular')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/patients returns patient list (not empty, not mock strings)', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const patients = res.body?.patients || res.body?.data || [];
    expect(patients.length).toBeGreaterThan(0);
    // Verify not returning hardcoded mock names
    patients.slice(0, 5).forEach((p: { firstName: string }) => {
      expect(p.firstName).not.toBe('Johnson');
      expect(p.firstName).not.toBe('Patient');
    });
  });

  it('GET /api/analytics/dashboard returns aggregate metrics', async () => {
    const token = makeToken({ role: 'executive' });
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Verify not Math.random() — same request twice should return same numbers
    const res2 = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body?.totalPatients).toBe(res2.body?.totalPatients);
  });

  it('Redox webhook endpoint validates HMAC signature', async () => {
    const res = await request(app)
      .post('/api/webhooks/redox')
      .set('x-redox-signature', 'invalidsignature')
      .send({ Meta: { EventType: 'NewPatient' }, Patient: {} });
    expect(res.status).toBe(401);
  });

  it('Redox webhook with valid HMAC returns 200', async () => {
    const crypto = require('crypto');
    const payload = JSON.stringify({ Meta: { EventType: 'NewPatient', Source: { ID: 'test' } } });
    const signature = crypto
      .createHmac('sha256', process.env.REDOX_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');
    const res = await request(app)
      .post('/api/webhooks/redox')
      .set('x-redox-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);
    expect([200, 202]).toContain(res.status);
  });

});

// ─────────────────────────────────────────────────────────────
// SECTION 7: RATE LIMITING & DOS PROTECTION REGRESSION
// ─────────────────────────────────────────────────────────────

describe('RATE LIMITING REGRESSION', () => {

  it('Rate limiter is applied before body parsing (order check)', async () => {
    // Send oversized body — if rate limiter is before body parser,
    // a 429 from rate limit should arrive before a 413 from body size
    // This is a structural test — verify middleware order hasn't changed
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('x'.repeat(2 * 1024 * 1024)); // 2MB body
    // Should be 413 (too large) or 429 (rate limited) — not 500 (crash)
    expect([400, 413, 429]).toContain(res.status);
  });

  it('Auth endpoint is rate limited after repeated failures', async () => {
    const requests = Array(20).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
    );
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });

});
```

---

## STEP 3 — BRANCH STRATEGY

Every finding gets its own branch and its own PR. No exceptions, even for 10-minute fixes.

```
feat/gap-navigation-polish          ← current working state, never fix directly on this
├── fix/CLIN-C1-race-gender-param   ← gender=BLACK fix (10 min)
├── fix/SEC-C3-mass-assignment      ← admin user PUT whitelist (15 min)
├── fix/SEC-tfvars-git-removal      ← git rm --cached + secret rotation (30 min)
├── fix/INFRA-common-tags           ← terraform local variable fix (5 min)
├── fix/SEC-C2-session-token-hash   ← accountSecurity.ts hash comparison (2-4 hrs)
└── fix/SEC-C4-mfa-login-session    ← MFA LoginSession creation (1-2 hrs)
```

**Creating a fix branch:**

```bash
git checkout feat/gap-navigation-polish
git pull origin feat/gap-navigation-polish
git checkout -b fix/FINDING-ID-short-description

# Make the fix
# Run smoke tests
npm test -- --testPathPattern=smoke

# If all green:
git add -p   # Stage changes interactively — review every hunk
git commit -m "fix(FINDING-ID): short description of what was fixed

- What was wrong: [one line]
- What was changed: [one line]  
- Clinical/security impact: [one line]
- Tests added: [yes/no + which test]"

git push origin fix/FINDING-ID-short-description
# Open PR against feat/gap-navigation-polish
```

---

## STEP 4 — PR CHECKLIST

**Save to: `.github/pull_request_template.md`**

```markdown
## Finding ID
<!-- e.g. SEC-C3, CLIN-C1, HIPAA-C1 -->

## What was wrong
<!-- One sentence: the exact bug or vulnerability -->

## What was changed
<!-- Files modified, approach taken -->

## Why this approach (not another)
<!-- Brief rationale — prevents future "why did we do it this way" -->

## Smoke test results
<!-- Paste output of: npm test -- --testPathPattern=smoke -->
- [ ] All smoke tests passing before this fix
- [ ] All smoke tests passing after this fix
- [ ] No previously-passing tests are now failing

## Type safety
- [ ] No new `any` types introduced
- [ ] No new `@ts-nocheck` added
- [ ] `npm run tsc --noEmit` passes

## Clinical safety (if touching gap detection, drug codes, clinical thresholds)
- [ ] Drug codes verified against RxNorm reference
- [ ] Guideline threshold sourced from: [cite guideline + year]
- [ ] Gap rule produces correct output for: (a) positive case, (b) negative case, (c) missing data case

## Security (if touching auth, encryption, or access control)
- [ ] No PHI in logs introduced
- [ ] No new hardcoded secrets
- [ ] Role checks enforced server-side (not just frontend)
- [ ] New endpoints added to route security matrix in PLATFORM_AUDIT.md

## HIPAA (if touching PHI fields, encryption, or audit logging)
- [ ] PHI fields encrypted at rest
- [ ] Audit log entry added where required
- [ ] DSAR cascade updated if new PHI model added

## Database (if touching schema.prisma)
- [ ] Migration file created with descriptive name (`npx prisma migrate dev --name fix_xxx`)
- [ ] Migration tested on database clone before running on demo database
- [ ] Seed scripts updated if schema changes affect them
- [ ] No breaking changes to existing data

## Infrastructure (if touching Terraform)
- [ ] `terraform plan` run and output reviewed — no unintended resource deletions
- [ ] No new secrets committed to tfvars or any tracked file
- [ ] AWS credentials not in any committed file

## Reviewer checklist
- [ ] I read every line of the diff, not just the summary
- [ ] I ran the smoke tests locally and they pass
- [ ] I understand what this change does and why
- [ ] I checked the danger zones table below and confirmed this fix is safe
```

---

## STEP 5 — DANGER ZONES

These files and systems have the highest regression risk. Extra caution required.

### 🔴 EXTREME RISK — one wrong line breaks everything

| File / System | What breaks if you get it wrong | Rules |
|---|---|---|
| `backend/auth.ts` | Every protected route simultaneously | Fix one issue at a time. Test every auth flow after each change. Never batch auth fixes. |
| `backend/middleware/auth.ts` | All route protection | Same as above |
| `backend/lib/phiEncryption.ts` | PHI stored/read incorrectly | Test encrypt → decrypt round trip. Test migration path for existing data. |
| `backend/lib/prisma.ts` | All database operations | Only ONE PrismaClient export. Test encryption still applies after any change. |
| `backend/gapDetectionRunner.ts` | The 5 working clinical gap rules | SURGICAL FIXES ONLY during sprint. Do not refactor. Do not restructure. Fix exact lines for drug codes, finerenone, ferritin/troponin, race field. Nothing else. |
| `prisma/schema.prisma` | Database structure for all environments | Always `prisma migrate dev` (never `db push`). Always on a database clone first. |

### 🟠 HIGH RISK — breaks a significant feature if wrong

| File / System | What breaks if you get it wrong | Rules |
|---|---|---|
| `backend/routes/admin.ts` | Admin CRUD, all health system management | Test hospital admin and super admin flows after every change |
| `backend/routes/clinicalIntelligence.ts` | Clinical data read/write for all patients | Test IDOR isolation after every change — Hospital A/B cross-tenant test |
| `backend/routes/webhooks.ts` | Redox integration — all EHR data ingest | Test HMAC validation after every change |
| `terraform/*.tf` | AWS infrastructure | `terraform plan` before every `apply`. Read every line of the diff. |
| `prisma/seed.ts` | Demo data | Run seed on clone database first. Verify demo tenants are intact after. |

### 🟡 MEDIUM RISK — breaks a specific feature if wrong

| File / System | What breaks if you get it wrong | Rules |
|---|---|---|
| Any frontend component | Visual regression in that component | Screenshot before/after on affected screen |
| `backend/routes/patients.ts` | Patient list and detail | Verify tenant scoping still applies after any change |
| `backend/utils/logger.ts` | Logging — PHI exposure or crash | Test that PHI fields are still redacted after any change |
| `.env.example` / environment config | Misconfigured deployments | Never commit real values. Keep example in sync with actual required vars. |

### 🟢 LOWER RISK — contained impact

| File / System | Rules |
|---|---|
| Dead code removal | Verify the file is truly not imported before deleting |
| Console.log removal | Test the endpoint the log was in still works |
| TypeScript type fixes | `npm run tsc --noEmit` must pass |
| Terraform logging/monitoring additions | `terraform plan` — should be additive only, no modifications |

---

## STEP 6 — DATABASE SAFETY PROTOCOL

**Never run any schema change or seed against your only database.**

```bash
# ─── BEFORE ANY SCHEMA MIGRATION ───────────────────────────────

# 1. Backup current state
pg_dump $DATABASE_URL > backups/backup_$(date +%Y%m%d_%H%M%S).sql
echo "Backup created. Verify it:"
psql $DATABASE_URL -c "\dt" | wc -l  # Count tables

# 2. Create a test clone
DB_NAME="tailrd_test_$(date +%Y%m%d_%H%M%S)"
createdb $DB_NAME
psql $DB_NAME < backups/backup_latest.sql
echo "Clone created: $DB_NAME"

# 3. Run migration against clone only
DATABASE_URL="postgresql://localhost/$DB_NAME" \
  npx prisma migrate dev --name your_migration_name

# 4. Verify migration on clone
DATABASE_URL="postgresql://localhost/$DB_NAME" \
  npx prisma db seed  # Re-seed to verify seed still works

# 5. Run smoke tests against clone
DATABASE_URL="postgresql://localhost/$DB_NAME" \
  npm test -- --testPathPattern=smoke

# 6. Only if all above pass — run against real database
npx prisma migrate deploy

# ─── DEMO DATABASE IS SACRED ───────────────────────────────────
# The demo database for Medical City Dallas, Mount Sinai, and
# CommonSpirit is a separate instance. Never run migrations
# directly against it until proven on a clone.
# Demo DB migrations require explicit sign-off before running.
```

**Keep backups for the duration of the sprint:**

```bash
# Add to .gitignore
echo "backups/*.sql" >> .gitignore

# Create backups directory
mkdir -p backups
echo "# Database backups — not committed to git" > backups/README.md
```

---

## STEP 7 — TERRAFORM SAFETY PROTOCOL

```bash
# ─── BEFORE ANY TERRAFORM CHANGE ───────────────────────────────

# 1. Pull latest state
terraform init
terraform refresh

# 2. ALWAYS plan before apply — read every line
terraform plan -out=tfplan_$(date +%Y%m%d_%H%M%S)

# 3. Check the plan for:
#    - Any "destroy" operations (red minus signs) — must be intentional
#    - Any unexpected resource modifications
#    - Resource counts: "X to add, Y to change, Z to destroy"
#    - Z (destroy) should be 0 for routine fixes

# 4. If plan looks correct:
terraform apply tfplan_$(date +%Y%m%d_%H%M%S)

# ─── FOR THE terraform.tfvars GIT REMOVAL ──────────────────────

# Remove from git tracking without deleting the file
git rm --cached terraform.tfvars
git rm --cached .terraform/ -r 2>/dev/null || true

# Add to .gitignore
echo "terraform.tfvars" >> .gitignore
echo ".terraform/" >> .gitignore
echo "*.tfplan" >> .gitignore
echo "terraform.tfstate" >> .gitignore
echo "terraform.tfstate.backup" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "fix(INFRA): remove terraform.tfvars and .terraform/ from git tracking

These files contained AWS account IDs and provider binaries.
They should never have been committed.
Secrets have been rotated. New values are in AWS Secrets Manager."

# After git rm --cached, rotate ALL secrets that were in tfvars:
# - AWS access key and secret key
# - Any VPC IDs, subnet IDs, KMS ARNs (these are recon data, not auth)
# Use AWS Secrets Manager for all values going forward
```

---

## STEP 8 — SECRET ROTATION PROTOCOL

Run immediately after removing credentials from git. Git history retains committed secrets
indefinitely — rotation invalidates the exposed values even if history is not scrubbed.

```bash
# ─── AWS CREDENTIALS ───────────────────────────────────────────
# 1. Log into AWS Console → IAM → Users → [tailrd-deploy]
# 2. Security credentials → Create access key (new pair)
# 3. Update in AWS Secrets Manager (not .env, not tfvars)
# 4. Delete old access key
# 5. Verify Terraform can still authenticate with new key

# ─── JWT SECRET ────────────────────────────────────────────────
# Generate a strong new secret (minimum 256 bits)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Store in AWS Secrets Manager as /tailrd/jwt-secret
# Update ECS task definition environment variable reference
# Deploy new task definition
# Verify: all existing user sessions will be invalidated (expected)

# ─── PHI ENCRYPTION KEY ────────────────────────────────────────
# WARNING: Rotating the PHI encryption key requires re-encrypting
# all existing PHI in the database. This is a coordinated operation:
# 1. Generate new key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 2. Write migration script that:
#    a. Reads each encrypted field with OLD key
#    b. Re-encrypts with NEW key
#    c. Writes back to database
# 3. Run migration on clone database first
# 4. Run smoke tests (PHI encryption regression section)
# 5. Run on production with maintenance window
# Store new key in AWS Secrets Manager as /tailrd/phi-encryption-key

# ─── DATABASE PASSWORD ─────────────────────────────────────────
# If DATABASE_URL was in tfvars or .env that was committed:
# 1. RDS → Modify → Change master password
# 2. Update in AWS Secrets Manager
# 3. Update ECS task definition
# 4. Verify connection health

# ─── VERIFY ROTATION WORKED ────────────────────────────────────
# After rotating each secret, verify the system still works:
npm test -- --testPathPattern=smoke
curl https://api.tailrd-heart.com/api/health
```

---

## STEP 9 — THE CONFIRMED-WORKING INVENTORY

What was working before the sprint. Protect all of this.

| System | Working State | Primary Risk During Sprint |
|--------|--------------|--------------------------|
| Login / JWT auth | ✅ Returns token, protects routes | Auth fixes (session hash, MFA) |
| Route protection | ✅ 401 on unauthenticated requests | Any auth middleware change |
| CORS | ✅ Locked to allowed origins | Any server.ts change |
| Redox HMAC validation | ✅ Rejects invalid signatures | webhooks.ts changes |
| PDF/Excel export | ✅ Generates formatted reports | No planned changes — low risk |
| PHI encryption (Patient) | ✅ firstName, lastName, MRN encrypted | Encryption expansion to new models |
| Gap rules (5 runtime) | ✅ Execute against real patient data (with bugs) | Drug code fixes, field fixes |
| Module navigation | ✅ All 6 modules reachable, 3-click rule met | Frontend component changes |
| Frosted glass UI | ✅ Consistent design across core views | CSS/Tailwind changes |
| Audit log (patient reads) | ✅ Writing to AuditLog on patient access | HIPAA expansion to new events |
| Prisma ORM | ✅ Parameterized queries, no SQL injection | Any $queryRaw addition |
| Seed data (BSW tenants) | ✅ Demo users and patients seeded | Schema migrations |
| Rate limiting (auth) | ✅ In-memory (not Redis — multi-instance risk) | Middleware order changes |
| TypeScript compilation | ✅ Builds (except App.tsx merge conflict) | Any .ts file changes |

---

## STEP 10 — REMEDIATION PRIORITY ORDER

Fix in this exact order. Each level must have passing smoke tests before the next begins.

### Level 0 — Do right now, takes under 1 hour total

These are fast and prevent Phase 2 audit results from being corrupted:

```
1. git rm --cached terraform.tfvars + .terraform/ + rotate secrets        (30 min)
2. Fix local.common_tags undefined in terraform locals.tf                  (5 min)
3. Fix gender === 'BLACK' → correct race field in evaluateGapRules         (10 min)
4. Whitelist fields on PUT /api/admin/users/:id                           (15 min)
```

### Level 1 — Fix before Phase 2 audit runs (2-4 hours)

```
5. Session token hash mismatch in accountSecurity.ts                      (2-4 hrs)
6. MFA verify creates LoginSession with complete claims                    (1-2 hrs)
```

### Level 2 — Fix before demo deployment (run Phase 2 in parallel)

```
7. GOD view global search tenant scoping                                   (2 hrs)
8. WebhookEvent.rawPayload PHI encryption                                 (4 hrs)
9. Cross-tenant PATCH on clinicalIntelligence interventions               (1 hr)
10. App.tsx merge conflict (build blocker)                                 (30 min)
11. internalOps.ts merge conflict                                          (30 min)
```

### Level 3 — Fix before any health system goes live

All remaining CRITICAL and HIGH findings from Phase 1 + Phase 2 output.

---

## QUICK REFERENCE — SMOKE TEST COMMANDS

```bash
# Run full smoke suite
npm test -- --testPathPattern=smoke --verbose

# Run only auth regression
npm test -- --testPathPattern=smoke/regression --testNamePattern="AUTH"

# Run only gap rule regression  
npm test -- --testPathPattern=smoke/regression --testNamePattern="GAP RULE"

# Run only tenant isolation
npm test -- --testPathPattern=smoke/regression --testNamePattern="MULTI-TENANCY"

# Run only PHI encryption
npm test -- --testPathPattern=smoke/regression --testNamePattern="PHI ENCRYPTION"

# Run only demo happy path
npm test -- --testPathPattern=smoke/regression --testNamePattern="DEMO HAPPY PATH"

# Watch mode during active development
npm test -- --testPathPattern=smoke --watch

# CI mode (no watch, exit code 0/1)
npm test -- --testPathPattern=smoke --ci --forceExit
```

---

## QUICK REFERENCE — PRE-MERGE CHECKLIST

Before merging any branch, confirm all of these:

```
[ ] npm test -- --testPathPattern=smoke    → all green
[ ] npm run tsc --noEmit                   → no errors
[ ] grep -n "console.log" [changed files]  → zero in auth/clinical paths
[ ] grep -rn "new PrismaClient()" backend/ → only lib/prisma.ts
[ ] terraform plan (if infra changed)      → zero unintended destroys
[ ] No hardcoded secrets in diff           → zero
[ ] PR template completed                  → all checkboxes checked
[ ] Smoke test output pasted in PR         → done
```

---

*Last updated: April 2026*
*Applies to: TAILRD_PLATFORM feat/gap-navigation-polish branch and all remediation branches*
*Revision required after: Phase 2 audit completion, any major architecture change*
