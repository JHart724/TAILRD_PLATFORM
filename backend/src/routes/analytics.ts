import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { trackFeature, trackNavigation, trackReportGeneration, ModuleType, ActivityType } from '../middleware/analytics';
import { body, query, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// Analytics Dashboard - Main Platform Metrics
router.get('/dashboard',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director', 'analyst']),
  [
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid time range'),
    query('hospitalId').optional().isString(),
    query('moduleType').optional().isIn(Object.values(ModuleType))
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const { timeRange = '30d', hospitalId, moduleType } = req.query;
      const user = req.user!;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Hospital access control
      const targetHospitalId = user.role === 'super-admin' ? 
        (hospitalId as string || null) : user.hospitalId;

      const whereClause: any = {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      };

      if (targetHospitalId) {
        whereClause.hospitalId = targetHospitalId;
      }

      if (moduleType) {
        whereClause.moduleType = moduleType;
      }

      // Parallel queries for dashboard metrics
      const [
        userActivityCount,
        uniqueUsersCount,
        featureUsageStats,
        performanceMetrics,
        topFeatures,
        activityByModule,
        errorStats,
        businessMetrics
      ] = await Promise.all([
        // Total user activities
        prisma.userActivity.count({ where: whereClause }),

        // Unique active users
        prisma.userActivity.findMany({
          where: whereClause,
          select: { userId: true },
          distinct: ['userId']
        }).then(users => users.filter(u => u.userId).length),

        // Feature usage aggregation
        prisma.featureUsage.aggregate({
          where: {
            date: {
              gte: startDate,
              lte: endDate
            },
            ...(targetHospitalId && { hospitalId: targetHospitalId }),
            ...(moduleType && { moduleType })
          },
          _sum: {
            usageCount: true,
            timeSpent: true
          }
        }),

        // Performance metrics
        prisma.performanceMetric.aggregate({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate
            },
            ...(targetHospitalId && { hospitalId: targetHospitalId })
          },
          _avg: {
            responseTime: true,
            memoryUsage: true,
            cpuUsage: true,
            dbQueryTime: true
          },
          _count: true
        }),

        // Top features by usage
        prisma.featureUsage.groupBy({
          by: ['featureName', 'moduleType'],
          where: {
            date: {
              gte: startDate,
              lte: endDate
            },
            ...(targetHospitalId && { hospitalId: targetHospitalId }),
            ...(moduleType && { moduleType })
          },
          _sum: {
            usageCount: true,
            timeSpent: true
          },
          orderBy: {
            _sum: {
              usageCount: 'desc'
            }
          },
          take: 10
        }),

        // Activity by module
        prisma.userActivity.groupBy({
          by: ['moduleType'],
          where: whereClause,
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          }
        }),

        // Error statistics
        prisma.errorLog.groupBy({
          by: ['severity'],
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate
            },
            ...(targetHospitalId && { hospitalId: targetHospitalId })
          },
          _count: {
            id: true
          }
        }),

        // Business metrics (if available)
        user.role === 'super-admin' ? prisma.businessMetric.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate
            },
            ...(targetHospitalId && { hospitalId: targetHospitalId })
          },
          orderBy: {
            date: 'desc'
          },
          take: 30
        }) : []
      ]);

      // Track this analytics view
      await trackFeature(req, 'Analytics Dashboard', ModuleType.ANALYTICS);

      res.json({
        success: true,
        data: {
          timeRange,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          overview: {
            totalActivities: userActivityCount,
            uniqueUsers: uniqueUsersCount,
            totalFeatureUsage: featureUsageStats._sum.usageCount || 0,
            totalTimeSpent: featureUsageStats._sum.timeSpent || 0,
            averageResponseTime: Math.round(performanceMetrics._avg.responseTime || 0),
            totalApiCalls: performanceMetrics._count
          },
          performance: {
            averageResponseTime: Math.round(performanceMetrics._avg.responseTime || 0),
            averageMemoryUsage: Math.round(performanceMetrics._avg.memoryUsage || 0),
            averageCpuUsage: performanceMetrics._avg.cpuUsage || 0,
            averageDbQueryTime: Math.round(performanceMetrics._avg.dbQueryTime || 0)
          },
          topFeatures: topFeatures.map(f => ({
            featureName: f.featureName,
            moduleType: f.moduleType,
            usageCount: f._sum.usageCount || 0,
            timeSpent: f._sum.timeSpent || 0
          })),
          activityByModule: activityByModule.map(a => ({
            moduleType: a.moduleType,
            activityCount: a._count.id
          })),
          errors: {
            bySeverity: errorStats.reduce((acc, e) => {
              acc[e.severity] = e._count.id;
              return acc;
            }, {} as Record<string, number>),
            total: errorStats.reduce((sum, e) => sum + e._count.id, 0)
          },
          businessMetrics: user.role === 'super-admin' ? businessMetrics : undefined
        },
        message: 'Analytics dashboard data retrieved',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics dashboard',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// User Activity Analytics
router.get('/user-activity',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director', 'analyst']),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('userId').optional().isString(),
    query('activityType').optional().isIn(Object.values(ActivityType)),
    query('moduleType').optional().isIn(Object.values(ModuleType)),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        startDate,
        endDate,
        userId,
        activityType,
        moduleType,
        page = 1,
        limit = 50
      } = req.query;
      
      const user = req.user!;
      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = {};

      // Hospital access control
      if (user.role !== 'super-admin') {
        whereClause.hospitalId = user.hospitalId;
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = new Date(startDate as string);
        if (endDate) whereClause.timestamp.lte = new Date(endDate as string);
      }

      if (userId) whereClause.userId = userId;
      if (activityType) whereClause.activityType = activityType;
      if (moduleType) whereClause.moduleType = moduleType;

      const [activities, totalCount] = await Promise.all([
        prisma.userActivity.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          skip,
          take: Number(limit),
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        }),
        prisma.userActivity.count({ where: whereClause })
      ]);

      await trackFeature(req, 'User Activity Analytics', ModuleType.ANALYTICS);

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          }
        },
        message: 'User activity data retrieved',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user activity data',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Feature Usage Analytics
router.get('/feature-usage',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director', 'analyst']),
  [
    query('moduleType').optional().isIn(Object.values(ModuleType)),
    query('featureName').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('groupBy').optional().isIn(['day', 'week', 'month', 'feature', 'module', 'user'])
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        moduleType,
        featureName,
        startDate,
        endDate,
        groupBy = 'day'
      } = req.query;

      const user = req.user!;

      const whereClause: any = {};

      // Hospital access control
      if (user.role !== 'super-admin') {
        whereClause.hospitalId = user.hospitalId;
      }

      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = new Date(startDate as string);
        if (endDate) whereClause.date.lte = new Date(endDate as string);
      }

      if (moduleType) whereClause.moduleType = moduleType;
      if (featureName) whereClause.featureName = featureName;

      let groupByFields: string[] = [];
      let orderBy: any = {};

      switch (groupBy) {
        case 'day':
          groupByFields = ['date'];
          orderBy = { date: 'desc' };
          break;
        case 'feature':
          groupByFields = ['featureName', 'moduleType'];
          orderBy = { _sum: { usageCount: 'desc' } };
          break;
        case 'module':
          groupByFields = ['moduleType'];
          orderBy = { _sum: { usageCount: 'desc' } };
          break;
        case 'user':
          groupByFields = ['userId'];
          orderBy = { _sum: { usageCount: 'desc' } };
          break;
        default:
          groupByFields = ['date'];
          orderBy = { date: 'desc' };
      }

      const featureUsage = await prisma.featureUsage.groupBy({
        by: groupByFields as any,
        where: whereClause,
        _sum: {
          usageCount: true,
          timeSpent: true
        },
        _avg: {
          timeSpent: true
        },
        orderBy,
        take: 100
      });

      await trackFeature(req, 'Feature Usage Analytics', ModuleType.ANALYTICS);

      res.json({
        success: true,
        data: {
          groupBy,
          featureUsage: featureUsage.map(usage => ({
            ...usage,
            totalUsage: usage._sum.usageCount || 0,
            totalTimeSpent: usage._sum.timeSpent || 0,
            averageTimeSpent: usage._avg.timeSpent || 0
          }))
        },
        message: 'Feature usage analytics retrieved',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve feature usage analytics',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Performance Metrics
router.get('/performance',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin']),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('endpoint').optional().isString(),
    query('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    query('groupBy').optional().isIn(['hour', 'day', 'endpoint', 'method'])
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        startDate,
        endDate,
        endpoint,
        method,
        groupBy = 'day'
      } = req.query;

      const user = req.user!;

      const whereClause: any = {};

      // Hospital access control
      if (user.role !== 'super-admin') {
        whereClause.hospitalId = user.hospitalId;
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = new Date(startDate as string);
        if (endDate) whereClause.timestamp.lte = new Date(endDate as string);
      }

      if (endpoint) whereClause.endpoint = { contains: endpoint };
      if (method) whereClause.method = method;

      // Get performance metrics with aggregation
      const performanceData = await prisma.performanceMetric.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      // Group and aggregate data based on groupBy parameter
      const groupedData = performanceData.reduce((acc: any, metric) => {
        let key: string;
        
        switch (groupBy) {
          case 'hour':
            key = new Date(metric.timestamp).toISOString().substring(0, 13) + ':00:00.000Z';
            break;
          case 'day':
            key = new Date(metric.timestamp).toISOString().substring(0, 10);
            break;
          case 'endpoint':
            key = metric.endpoint;
            break;
          case 'method':
            key = metric.method;
            break;
          default:
            key = new Date(metric.timestamp).toISOString().substring(0, 10);
        }

        if (!acc[key]) {
          acc[key] = {
            key,
            count: 0,
            totalResponseTime: 0,
            totalMemoryUsage: 0,
            totalCpuUsage: 0,
            totalDbQueryTime: 0,
            errors: 0
          };
        }

        acc[key].count++;
        acc[key].totalResponseTime += metric.responseTime;
        acc[key].totalMemoryUsage += metric.memoryUsage || 0;
        acc[key].totalCpuUsage += metric.cpuUsage || 0;
        acc[key].totalDbQueryTime += metric.dbQueryTime || 0;
        if (metric.statusCode >= 400) acc[key].errors++;

        return acc;
      }, {});

      // Calculate averages
      const results = Object.values(groupedData).map((group: any) => ({
        ...group,
        averageResponseTime: Math.round(group.totalResponseTime / group.count),
        averageMemoryUsage: Math.round(group.totalMemoryUsage / group.count),
        averageCpuUsage: Math.round((group.totalCpuUsage / group.count) * 100) / 100,
        averageDbQueryTime: Math.round(group.totalDbQueryTime / group.count),
        errorRate: Math.round((group.errors / group.count) * 100) / 100
      }));

      await trackFeature(req, 'Performance Analytics', ModuleType.ANALYTICS);

      res.json({
        success: true,
        data: {
          groupBy,
          metrics: results.sort((a, b) => a.key.localeCompare(b.key))
        },
        message: 'Performance metrics retrieved',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Manual Event Tracking Endpoint
router.post('/track',
  authenticateToken,
  [
    body('eventType').isIn(['navigation', 'feature_use', 'report_generation', 'custom']),
    body('eventName').isString().isLength({ min: 1 }),
    body('moduleType').optional().isIn(Object.values(ModuleType)),
    body('metadata').optional().isObject(),
    body('value').optional().isNumeric()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const { eventType, eventName, moduleType, metadata, value } = req.body;
      const user = req.user!;

      switch (eventType) {
        case 'navigation':
          await trackNavigation(req, eventName, moduleType);
          break;
        case 'feature_use':
          await trackFeature(req, eventName, moduleType || ModuleType.ANALYTICS, value);
          break;
        case 'report_generation':
          await trackReportGeneration(
            req,
            eventName,
            moduleType || ModuleType.ANALYTICS,
            metadata?.format || 'Unknown',
            metadata?.parameters
          );
          break;
        default:
          // Custom event tracking
          await trackFeature(req, eventName, moduleType || ModuleType.ANALYTICS, value);
      }

      res.json({
        success: true,
        data: {
          eventType,
          eventName,
          tracked: true
        },
        message: 'Event tracked successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to track event',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

export = router;