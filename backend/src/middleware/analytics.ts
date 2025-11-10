import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth';

const prisma = new PrismaClient();

// Activity type definitions
export enum ActivityType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  NAVIGATION = 'NAVIGATION',
  API_CALL = 'API_CALL',
  FEATURE_USE = 'FEATURE_USE',
  REPORT_GENERATION = 'REPORT_GENERATION',
  DATA_EXPORT = 'DATA_EXPORT',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  CONFIGURATION = 'CONFIGURATION',
  SEARCH = 'SEARCH',
  FILTER = 'FILTER',
  ALERT_INTERACTION = 'ALERT_INTERACTION',
  ERROR = 'ERROR'
}

export enum ModuleType {
  HEART_FAILURE = 'HEART_FAILURE',
  ELECTROPHYSIOLOGY = 'ELECTROPHYSIOLOGY',
  STRUCTURAL_HEART = 'STRUCTURAL_HEART',
  CORONARY_INTERVENTION = 'CORONARY_INTERVENTION',
  PERIPHERAL_VASCULAR = 'PERIPHERAL_VASCULAR',
  VALVULAR_DISEASE = 'VALVULAR_DISEASE',
  ADMIN = 'ADMIN',
  ANALYTICS = 'ANALYTICS'
}

interface AnalyticsMetadata {
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  pageUrl?: string;
  referrer?: string;
  deviceType?: string;
  browserType?: string;
  screenResolution?: string;
  queryParams?: Record<string, any>;
  requestBody?: Record<string, any>;
  errorMessage?: string;
  errorStack?: string;
}

class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private isEnabled: boolean = true;
  private batchSize: number = 50;
  private flushInterval: number = 30000; // 30 seconds
  private activityBuffer: any[] = [];
  private performanceBuffer: any[] = [];
  private featureUsageBuffer: any[] = [];

  private constructor() {
    // Start periodic flush
    this.startPeriodicFlush();
  }

  public static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  // Track user activity
  public async trackActivity(data: {
    userId?: string;
    hospitalId: string;
    activityType: ActivityType;
    action: string;
    resourceType?: string;
    resourceId?: string;
    moduleType?: ModuleType;
    duration?: number;
    metadata?: AnalyticsMetadata;
  }) {
    if (!this.isEnabled) return;

    const activity = {
      userId: data.userId,
      hospitalId: data.hospitalId,
      activityType: data.activityType,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      moduleType: data.moduleType,
      duration: data.duration,
      ipAddress: data.metadata?.ipAddress,
      userAgent: data.metadata?.userAgent,
      sessionId: data.metadata?.sessionId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      timestamp: new Date()
    };

    this.activityBuffer.push(activity);
    
    if (this.activityBuffer.length >= this.batchSize) {
      await this.flushActivities();
    }
  }

  // Track performance metrics
  public async trackPerformance(data: {
    hospitalId: string;
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    memoryUsage?: number;
    cpuUsage?: number;
    dbQueryTime?: number;
    metadata?: AnalyticsMetadata;
  }) {
    if (!this.isEnabled) return;

    const performance = {
      hospitalId: data.hospitalId,
      endpoint: data.endpoint,
      method: data.method,
      responseTime: data.responseTime,
      statusCode: data.statusCode,
      memoryUsage: data.memoryUsage,
      cpuUsage: data.cpuUsage,
      dbQueryTime: data.dbQueryTime,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      timestamp: new Date()
    };

    this.performanceBuffer.push(performance);

    if (this.performanceBuffer.length >= this.batchSize) {
      await this.flushPerformanceMetrics();
    }
  }

  // Track feature usage
  public async trackFeatureUsage(data: {
    userId?: string;
    hospitalId: string;
    featureName: string;
    moduleType: ModuleType;
    usageCount?: number;
    timeSpent?: number;
    metadata?: AnalyticsMetadata;
  }) {
    if (!this.isEnabled) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const feature = {
      userId: data.userId,
      hospitalId: data.hospitalId,
      featureName: data.featureName,
      moduleType: data.moduleType,
      usageCount: data.usageCount || 1,
      timeSpent: data.timeSpent,
      date: today,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null
    };

    this.featureUsageBuffer.push(feature);

    if (this.featureUsageBuffer.length >= this.batchSize) {
      await this.flushFeatureUsage();
    }
  }

  // Track errors
  public async trackError(data: {
    userId?: string;
    hospitalId: string;
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    endpoint?: string;
    method?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    metadata?: AnalyticsMetadata;
  }) {
    try {
      await prisma.errorLog.create({
        data: {
          userId: data.userId,
          hospitalId: data.hospitalId,
          errorType: data.errorType,
          errorMessage: data.errorMessage,
          errorStack: data.errorStack,
          endpoint: data.endpoint,
          method: data.method,
          severity: data.severity,
          ipAddress: data.metadata?.ipAddress,
          userAgent: data.metadata?.userAgent,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          resolved: false
        }
      });
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }

  // Flush buffers to database
  private async flushActivities() {
    if (this.activityBuffer.length === 0) return;

    try {
      await prisma.userActivity.createMany({
        data: this.activityBuffer
      });
      this.activityBuffer = [];
    } catch (error) {
      console.error('Failed to flush user activities:', error);
    }
  }

  private async flushPerformanceMetrics() {
    if (this.performanceBuffer.length === 0) return;

    try {
      await prisma.performanceMetric.createMany({
        data: this.performanceBuffer
      });
      this.performanceBuffer = [];
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
    }
  }

  private async flushFeatureUsage() {
    if (this.featureUsageBuffer.length === 0) return;

    try {
      // Use upsert for feature usage to handle daily aggregation
      for (const feature of this.featureUsageBuffer) {
        await prisma.featureUsage.upsert({
          where: {
            hospitalId_featureName_moduleType_date_userId: {
              hospitalId: feature.hospitalId,
              featureName: feature.featureName,
              moduleType: feature.moduleType,
              date: feature.date,
              userId: feature.userId || ''
            }
          },
          update: {
            usageCount: {
              increment: feature.usageCount
            },
            timeSpent: feature.timeSpent ? {
              increment: feature.timeSpent
            } : undefined
          },
          create: feature
        });
      }
      this.featureUsageBuffer = [];
    } catch (error) {
      console.error('Failed to flush feature usage:', error);
    }
  }

  private startPeriodicFlush() {
    setInterval(async () => {
      await Promise.all([
        this.flushActivities(),
        this.flushPerformanceMetrics(),
        this.flushFeatureUsage()
      ]);
    }, this.flushInterval);
  }

  public async flushAll() {
    await Promise.all([
      this.flushActivities(),
      this.flushPerformanceMetrics(),
      this.flushFeatureUsage()
    ]);
  }

  public disable() {
    this.isEnabled = false;
  }

  public enable() {
    this.isEnabled = true;
  }
}

// Middleware to track API performance and user activities
export const analyticsMiddleware = (options: {
  trackPerformance?: boolean;
  trackActivities?: boolean;
  excludePaths?: string[];
} = {}) => {
  const {
    trackPerformance = true,
    trackActivities = true,
    excludePaths = ['/health', '/api/status']
  } = options;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const tracker = AnalyticsTracker.getInstance();

    // Skip tracking for excluded paths
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Extract metadata
    const metadata: AnalyticsMetadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      pageUrl: req.originalUrl,
      referrer: req.get('Referer'),
      queryParams: req.query,
      requestBody: req.method !== 'GET' ? req.body : undefined
    };

    // Track API call activity
    if (trackActivities && req.user) {
      await tracker.trackActivity({
        userId: req.user.userId,
        hospitalId: req.user.hospitalId || 'platform',
        activityType: ActivityType.API_CALL,
        action: `${req.method} ${req.path}`,
        resourceType: 'API_ENDPOINT',
        metadata
      });
    }

    // Override res.json to capture response details
    const originalJson = res.json;
    res.json = function(body: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Track performance metrics
      if (trackPerformance && req.user) {
        tracker.trackPerformance({
          hospitalId: req.user.hospitalId || 'platform',
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          memoryUsage: process.memoryUsage().heapUsed,
          metadata
        });
      }

      // Track errors
      if (res.statusCode >= 400 && req.user) {
        const severity = res.statusCode >= 500 ? 'HIGH' : 'MEDIUM';
        tracker.trackError({
          userId: req.user.userId,
          hospitalId: req.user.hospitalId || 'platform',
          errorType: 'HTTP_ERROR',
          errorMessage: `${res.statusCode} ${req.method} ${req.path}`,
          endpoint: req.path,
          method: req.method,
          severity,
          metadata
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

// Helper functions for feature tracking
export const trackFeature = async (
  req: AuthenticatedRequest,
  featureName: string,
  moduleType: ModuleType,
  timeSpent?: number
) => {
  if (!req.user) return;

  const tracker = AnalyticsTracker.getInstance();
  await tracker.trackFeatureUsage({
    userId: req.user.userId,
    hospitalId: req.user.hospitalId || 'platform',
    featureName,
    moduleType,
    timeSpent,
    metadata: {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  });
};

export const trackNavigation = async (
  req: AuthenticatedRequest,
  page: string,
  moduleType?: ModuleType
) => {
  if (!req.user) return;

  const tracker = AnalyticsTracker.getInstance();
  await tracker.trackActivity({
    userId: req.user.userId,
    hospitalId: req.user.hospitalId || 'platform',
    activityType: ActivityType.NAVIGATION,
    action: `Navigate to ${page}`,
    resourceType: 'PAGE',
    moduleType,
    metadata: {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      pageUrl: req.originalUrl
    }
  });
};

export const trackReportGeneration = async (
  req: AuthenticatedRequest,
  reportType: string,
  moduleType: ModuleType,
  format: string,
  parameters?: Record<string, any>
) => {
  if (!req.user) return;

  const tracker = AnalyticsTracker.getInstance();
  
  // Track as activity
  await tracker.trackActivity({
    userId: req.user.userId,
    hospitalId: req.user.hospitalId || 'platform',
    activityType: ActivityType.REPORT_GENERATION,
    action: `Generate ${reportType} report`,
    resourceType: 'REPORT',
    moduleType,
    metadata: {
      reportType,
      format,
      parameters,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  });

  // Track in report generation table
  try {
    await prisma.reportGeneration.create({
      data: {
        userId: req.user.userId,
        hospitalId: req.user.hospitalId || 'platform',
        reportType,
        moduleType,
        format,
        parameters: parameters ? JSON.stringify(parameters) : null,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to track report generation:', error);
  }
};

export default AnalyticsTracker;