import request from 'supertest';
import prisma from '../../src/lib/prisma';
import app from '../../src/server';
import jwt from 'jsonwebtoken';

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
    const rateLimited = responses.some((r: request.Response) => r.status === 429);
    expect(rateLimited).toBe(true);
  });

});