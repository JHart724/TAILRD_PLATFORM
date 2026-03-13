import winston from 'winston';

/**
 * Winston Logger Configuration
 * HIPAA-compliant logging for healthcare applications
 * Excludes PHI and PII from logs
 */

const { combine, timestamp, errors, json, simple, colorize } = winston.format;

// Custom format to exclude sensitive data
const excludeSensitiveData = winston.format((info) => {
  // Remove sensitive fields from log data
  const sensitiveFields = [
    'ssn', 'socialSecurityNumber', 'password', 'token', 'apiKey',
    'dob', 'dateOfBirth', 'phone', 'phoneNumber', 'email',
    'address', 'zipCode', 'postalCode', 'creditCard', 'bankAccount'
  ];

  const cleanObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowercaseKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowercaseKey.includes(field))) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        cleaned[key] = cleanObject(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  return {
    ...info,
    ...cleanObject(info)
  };
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    excludeSensitiveData(),
    json()
  ),
  defaultMeta: { 
    service: 'tailrd-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Audit log for HIPAA compliance
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 50, // Keep more audit logs
      tailable: true,
      format: combine(
        timestamp(),
        json()
      )
    })
  ],
  
  // Don't exit on handled exceptions
  exitOnError: false
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      simple()
    )
  }));
}

// Add CloudWatch transport for production (if configured)
if (process.env.NODE_ENV === 'production' && process.env.AWS_CLOUDWATCH_GROUP) {
  const CloudWatchTransport = require('winston-cloudwatch');
  
  logger.add(new CloudWatchTransport({
    logGroupName: process.env.AWS_CLOUDWATCH_GROUP,
    logStreamName: `tailrd-backend-${new Date().toISOString().split('T')[0]}`,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    messageFormatter: (item: any) => {
      return `${item.timestamp} [${item.level}] ${item.message} ${JSON.stringify(item.meta)}`;
    }
  }));
}

// Helper functions for structured logging
export const logAPI = {
  request: (req: any, additionalData?: any) => {
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  },

  response: (req: any, res: any, processingTime?: number) => {
    logger.info('API Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      processingTime: processingTime ? `${processingTime}ms` : undefined,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  },

  error: (req: any, error: Error, additionalData?: any) => {
    logger.error('API Error', {
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  }
};

export const logRedox = {
  webhook: (payload: any, processingTime?: number) => {
    logger.info('Redox Webhook', {
      dataModel: payload.Meta?.DataModel,
      eventType: payload.Meta?.EventType,
      facilityCode: payload.Meta?.FacilityCode,
      isTest: payload.Meta?.Test,
      timestamp: payload.Meta?.EventDateTime,
      processingTime: processingTime ? `${processingTime}ms` : undefined
    });
  },

  error: (payload: any, error: Error) => {
    logger.error('Redox Webhook Error', {
      dataModel: payload.Meta?.DataModel,
      eventType: payload.Meta?.EventType,
      facilityCode: payload.Meta?.FacilityCode,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

export const logAudit = {
  userAction: (userId: string, action: string, resource: string, additionalData?: any) => {
    logger.info('User Action', {
      userId,
      action,
      resource,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  },

  dataAccess: (userId: string, dataType: string, patientId?: string, additionalData?: any) => {
    logger.info('Data Access', {
      userId,
      dataType,
      patientId: patientId ? '[PATIENT_ID]' : undefined, // Don't log actual patient IDs
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  },

  systemEvent: (event: string, additionalData?: any) => {
    logger.info('System Event', {
      event,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  }
};

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Don't exit immediately in production - give time for logging
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    process.exit(1);
  }
});

// Graceful shutdown logging
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - initiating graceful shutdown');
});

process.on('SIGINT', () => {
  logger.info('SIGINT received - initiating graceful shutdown');
});

export default logger;