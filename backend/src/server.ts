import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import prisma from './lib/prisma';
import { logger } from './utils/logger';
import { APIResponse } from './types';
import { analyticsMiddleware } from './middleware/analytics';
import { csrfCookieSetter, csrfProtection, csrfTokenEndpoint } from './middleware/csrfProtection';
import { loginRateLimit } from './middleware/authRateLimit';

config();

const NODE_ENV = process.env.NODE_ENV || 'development';
// DEMO_MODE only allowed when NODE_ENV is EXPLICITLY set to development or test
const isExplicitDevOrTest = ['development', 'test'].includes(process.env.NODE_ENV ?? '');
const isDemoMode = process.env.DEMO_MODE === 'true' && isExplicitDevOrTest;

// ── CRITICAL: Prevent DEMO_MODE from reaching any deployed environment ────────
if (process.env.DEMO_MODE === 'true' && !isExplicitDevOrTest) {
  console.error('\n╔══════════════════════════════════════════════════════════════╗');
  console.error('║  FATAL: DEMO_MODE=true is only allowed in development/test ║');
  console.error('║  Set DEMO_MODE=false or remove it from environment.        ║');
  console.error('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}
if (isDemoMode) {
  console.warn('⚠️  DEMO_MODE is active. All auth, RBAC, and tenant isolation are disabled.');
}

// ── CRITICAL: PHI_ENCRYPTION_KEY required outside demo mode ──────────────────
if (!isDemoMode && !process.env.PHI_ENCRYPTION_KEY) {
  console.error('\n╔══════════════════════════════════════════════════════════════╗');
  console.error('║  FATAL: PHI_ENCRYPTION_KEY must be set outside demo mode.   ║');
  console.error('║  Generate: node -e "console.log(require(\'crypto\')           ║');
  console.error('║  .randomBytes(32).toString(\'hex\'))"                         ║');
  console.error('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}

// ── CRITICAL: JWT_SECRET required when not in demo mode ───────────────────────
if (!isDemoMode && !process.env.JWT_SECRET) {
  console.error('\n╔══════════════════════════════════════════════════════════════╗');
  console.error('║  FATAL: JWT_SECRET must be set when DEMO_MODE is off.      ║');
  console.error('║  Set JWT_SECRET in your environment variables.             ║');
  console.error('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Logger imported from utils/logger.ts (shared singleton with PHI redaction)

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || '']
    : ['http://localhost:3000', 'http://localhost:5173']);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (!origin) {
      // No Origin header = not a browser request (curl, ALB health checks, server-to-server)
      // CORS is a browser security mechanism — non-browser requests are always allowed
      callback(null, true);
    } else {
      // Browser request from an origin not in allowedOrigins — block it
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors(corsOptions));
app.use(cookieParser());

// Rate limiter BEFORE body parsing to reject abusive traffic without parsing 1MB payloads
app.use('/api/', limiter);

app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => {
    // Capture raw body for webhook HMAC verification
    if (req.url?.startsWith('/api/webhooks')) {
      req.rawBody = buf.toString('utf8');
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CSRF protection — sets token cookie on all responses, validates on mutations
app.use(csrfCookieSetter);
app.use(csrfProtection);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Analytics middleware for tracking user activities and performance
// Disabled in demo mode — Prisma engine isn't available without a real DB
if (!isDemoMode) {
  app.use('/api/', analyticsMiddleware({
    trackPerformance: true,
    trackActivities: true,
    excludePaths: ['/health', '/api/status', '/api/auth/demo-users']
  }));
}

// CDS Hooks — mounted before auth middleware (CDS uses its own JWT)
app.use('/cds-services', require('./routes/cdsHooks').default);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: NODE_ENV,
      uptime: process.uptime()
    },
    message: 'TAILRD Platform Backend is running'
  } as APIResponse);
});

app.get('/api/status', async (req, res) => {
  const checks: Record<string, string> = {};

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch {
    checks.database = 'disconnected';
  }

  // Redis check
  checks.redis = 'not_configured';

  const allHealthy = Object.values(checks).every(v => v === 'connected' || v === 'not_configured');
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: checks,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// CSRF token endpoint (SPA calls this to get a token before mutations)
app.get('/api/auth/csrf-token', csrfTokenEndpoint);

// Auth routes with aggressive rate limiting
app.use('/api/auth', loginRateLimit, require('./routes/auth'));

// SSO/SAML routes (Cognito hosted UI integration)
app.use('/api/sso', require('./routes/sso').default);

app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/modules', require('./routes/modules'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/cql', require('./routes/cqlRules'));
app.use('/api/phenotypes', require('./routes/phenotypes'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/content', require('./routes/content'));
app.use('/api/clinical', require('./routes/clinicalIntelligence'));
app.use('/api/internal', require('./routes/internalOps'));
app.use('/api/account', require('./routes/accountSecurity'));
app.use('/api/data-requests', require('./routes/dataRequests'));
app.use('/api/breach-incidents', require('./routes/breachNotification'));
app.use('/api/audit', require('./routes/auditExport'));
app.use('/api/files', require('./routes/files'));
app.use('/api/data', require('./routes/upload'));
app.use('/api/platform', require('./routes/platform').default);
app.use('/api/gaps', require('./routes/gaps').default);
app.use('/api/users', require('./routes/invite').default);
app.use('/api/mfa', require('./routes/mfa').default);
app.use('/api/notifications', require('./routes/notifications').default);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.baseUrl} does not exist`,
    timestamp: new Date().toISOString()
  } as APIResponse);
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Global error handler:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const statusCode = error.statusCode || error.status || 500;
  const message = NODE_ENV === 'production' ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...(NODE_ENV === 'development' && { stack: error.stack })
  } as APIResponse);
});

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason: reason?.message || reason });
  // In demo mode, don't crash on Prisma engine errors (no DB needed)
  if (isDemoMode && reason?.name === 'PrismaClientInitializationError') {
    logger.warn('Prisma engine unavailable — demo mode will use in-memory data only');
    return;
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', { error: error.message, stack: error.stack });
  process.exit(1);
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`TAILRD Platform Backend running on port ${PORT}`, {
      environment: NODE_ENV,
      port: PORT,
      timestamp: new Date().toISOString()
    });

    // Clinical alert cron jobs (production only)
    if (NODE_ENV === 'production') {
      const cron = require('node-cron');
      const { runDailyDigestForAllHospitals, runWeeklySummaryForAllHospitals } = require('./services/clinicalAlertService');

      // Daily digest at 7:00 AM EST every day
      cron.schedule('0 12 * * *', async () => { // 12:00 UTC = 7:00 AM EST
        logger.info('Running daily gap digest for all hospitals');
        const result = await runDailyDigestForAllHospitals();
        logger.info(`Daily digest complete: ${result.emails} emails to ${result.hospitals} hospitals`);
      });

      // Weekly summary every Monday at 8:00 AM EST
      cron.schedule('0 13 * * 1', async () => { // 13:00 UTC Monday = 8:00 AM EST Monday
        logger.info('Running weekly gap summary for all hospitals');
        const result = await runWeeklySummaryForAllHospitals();
        logger.info(`Weekly summary complete: ${result.emails} emails to ${result.hospitals} hospitals`);
      });

      logger.info('Clinical alert cron jobs scheduled (daily digest 7am EST, weekly summary Mon 8am EST)');

      // Webhook retry queue — every 5 minutes
      const { processRetryQueue } = require('./services/webhookPipeline');
      setInterval(async () => {
        try {
          // processRetryQueue needs a dispatch function — re-route through the webhook handler
          // For now, log retryable events count without re-dispatching (dispatch requires refactoring)
          const retryCount = await require('./lib/prisma').default.webhookEvent.count({ where: { status: 'RETRYING' } });
          if (retryCount > 0) {
            logger.info(`Webhook retry queue: ${retryCount} events pending retry`);
          }
        } catch (error) {
          logger.error('Retry queue check failed', { error: error instanceof Error ? error.message : String(error) });
        }
      }, 5 * 60 * 1000);
      logger.info('Webhook retry queue monitor scheduled (every 5 minutes)');
    }
  });
}

export default app;