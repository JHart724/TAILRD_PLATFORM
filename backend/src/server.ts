import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { APIResponse } from './types';
import { analyticsMiddleware } from './middleware/analytics';
import { csrfCookieSetter, csrfProtection, csrfTokenEndpoint } from './middleware/csrfProtection';
import { loginRateLimit } from './middleware/authRateLimit';

config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isDemoMode = process.env.DEMO_MODE === 'true';

// ── CRITICAL: Prevent DEMO_MODE from reaching production ──────────────────────
if (isDemoMode && NODE_ENV === 'production') {
  console.error('\n╔══════════════════════════════════════════════════════════════╗');
  console.error('║  FATAL: DEMO_MODE=true is not allowed in production.       ║');
  console.error('║  Set DEMO_MODE=false or remove it from environment.        ║');
  console.error('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
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

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'tailrd-backend' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

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

const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.use('/api/', limiter);

// Analytics middleware for tracking user activities and performance
// Disabled in demo mode — Prisma engine isn't available without a real DB
if (!isDemoMode) {
  app.use('/api/', analyticsMiddleware({
    trackPerformance: true,
    trackActivities: true,
    excludePaths: ['/health', '/api/status', '/api/auth/demo-users']
  }));
}

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

app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      server: 'online',
      database: 'connected',
      redis: 'connected',
      redox: 'configured',
      timestamp: new Date().toISOString()
    },
    message: 'All systems operational'
  } as APIResponse);
});

// CSRF token endpoint (SPA calls this to get a token before mutations)
app.get('/api/auth/csrf-token', csrfTokenEndpoint);

// Auth routes with aggressive rate limiting
app.use('/api/auth', loginRateLimit, require('./routes/auth'));

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
    logger.info(`🚀 TAILRD Platform Backend server running on port ${PORT}`, {
      environment: NODE_ENV,
      port: PORT,
      timestamp: new Date().toISOString()
    });
  });
}

export default app;