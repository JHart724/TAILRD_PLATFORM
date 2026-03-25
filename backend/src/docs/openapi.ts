/**
 * OpenAPI 3.0 Specification for TAILRD Platform API
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TAILRD Heart Platform API',
    description: 'Cardiovascular intelligence platform API. Clinical gap detection, risk assessment, registry pre-population, and trial eligibility screening.',
    version: '1.0.0',
    contact: {
      name: 'TAILRD Engineering',
      email: 'api@tailrd.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    { url: 'http://localhost:3001/api', description: 'Development' },
    { url: 'https://api.tailrd.com/api', description: 'Production' },
  ],
  tags: [
    { name: 'Authentication', description: 'JWT authentication and session management' },
    { name: 'Patients', description: 'Patient demographics and clinical data' },
    { name: 'Gap Detection', description: 'Clinical gap identification and tracking' },
    { name: 'Risk Scores', description: 'Clinical risk score calculation' },
    { name: 'Modules', description: 'Clinical module dashboards and data' },
    { name: 'Registry', description: 'Registry pre-population (CathPCI, TVT, ICD, GWTG-HF)' },
    { name: 'Trials', description: 'Clinical trial eligibility screening' },
    { name: 'CQL Rules', description: 'Clinical Quality Language rule management' },
    { name: 'Webhooks', description: 'Redox EHR integration webhooks' },
    { name: 'Files', description: 'HIPAA-compliant file storage (S3)' },
    { name: 'Audit', description: 'Compliance and audit trail' },
    { name: 'Admin', description: 'System administration' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from POST /auth/login',
      },
    },
    schemas: {
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          mrn: { type: 'string', description: 'Medical Record Number' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          birthDate: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'] },
          hospitalId: { type: 'string', format: 'uuid' },
        },
      },
      ClinicalGap: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          gapType: { type: 'string', enum: ['MEDICATION_MISSING', 'MEDICATION_UNDERDOSED', 'DEVICE_ELIGIBLE', 'MONITORING_OVERDUE', 'FOLLOWUP_OVERDUE'] },
          severity: { type: 'string', enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
          patientCount: { type: 'integer' },
          dollarOpportunity: { type: 'number' },
          module: { type: 'string', enum: ['HEART_FAILURE', 'ELECTROPHYSIOLOGY', 'STRUCTURAL_HEART', 'CORONARY_INTERVENTION', 'PERIPHERAL_VASCULAR', 'VALVULAR_DISEASE'] },
          evidence: { type: 'string' },
          recommendedAction: { type: 'string' },
          methodologyNote: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              refreshToken: { type: 'string' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER', 'QUALITY_DIRECTOR', 'ANALYST', 'VIEWER'] },
          hospitalId: { type: 'string', format: 'uuid' },
        },
      },
      APIResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh JWT token',
        responses: {
          '200': { description: 'Token refreshed' },
          '401': { description: 'Invalid or expired token' },
        },
      },
    },
    '/patients': {
      get: {
        tags: ['Patients'],
        summary: 'List patients (hospital-scoped)',
        parameters: [
          { name: 'module', in: 'query', schema: { type: 'string' }, description: 'Filter by clinical module' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': { description: 'Patient list' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/patients/{patientId}': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient details',
        parameters: [
          { name: 'patientId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Patient details' },
          '404': { description: 'Patient not found' },
        },
      },
    },
    '/patients/{patientId}/observations': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient lab results and vitals',
        parameters: [
          { name: 'patientId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Lab results and vitals' } },
      },
    },
    '/cql/gaps/{hospitalId}': {
      get: {
        tags: ['Gap Detection'],
        summary: 'Get therapy gaps for hospital',
        parameters: [
          { name: 'hospitalId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'module', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'List of detected therapy gaps' } },
      },
    },
    '/clinical/risk-scores/{patientId}': {
      get: {
        tags: ['Risk Scores'],
        summary: 'Get calculated risk scores',
        parameters: [
          { name: 'patientId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Risk score results (MAGGIC, CHA2DS2-VASc, STS, etc.)' } },
      },
    },
    '/webhooks/redox': {
      post: {
        tags: ['Webhooks'],
        summary: 'Redox EHR webhook receiver',
        security: [],
        description: 'Receives FHIR R4 bundles from Redox. Validates HMAC signature. Processes patient clinical data for gap detection.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          '200': { description: 'Webhook processed' },
          '400': { description: 'Invalid payload' },
          '401': { description: 'Invalid signature' },
        },
      },
    },
    '/files/upload-url': {
      post: {
        tags: ['Files'],
        summary: 'Get S3 pre-signed upload URL',
        description: 'Returns a temporary pre-signed URL for uploading files to HIPAA-compliant S3 storage. URL expires in 5 minutes.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fileName: { type: 'string' },
                  fileType: { type: 'string' },
                  category: { type: 'string', enum: ['patient-document', 'clinical-report', 'audit-export'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Pre-signed URL generated' },
          '403': { description: 'Insufficient permissions' },
        },
      },
    },
    '/audit': {
      get: {
        tags: ['Audit'],
        summary: 'List audit log entries',
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Audit log entries' } },
      },
    },
  },
};
