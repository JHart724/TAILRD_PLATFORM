import { Router, Response } from 'express';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ContentIntelligenceService } from '../services/contentIntelligenceService';
import { query, validationResult } from 'express-validator';

const router = Router();

// Initialize content intelligence service (singleton pattern)
let contentService: ContentIntelligenceService;

const initializeContentService = async () => {
  if (!contentService) {
    logger.info('Initializing content intelligence service');
    contentService = new ContentIntelligenceService();
    await contentService.initialize();
    logger.info('Content intelligence service initialized');
  }
  return contentService;
};

/**
 * GET /api/content/latest
 * Get latest clinical content across all modules
 */
router.get('/latest',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director', 'physician', 'analyst']),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('since').optional().isISO8601(),
    query('contentType').optional().isString(),
    query('category').optional().isString(),
    query('minRelevanceScore').optional().isFloat({ min: 0, max: 1 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
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

      const {
        limit = 20,
        since,
        contentType,
        category,
        minRelevanceScore = 0.5
      } = req.query;

      const service = await initializeContentService();

      // Get latest content with ingest if needed
      const result = await service.ingestLatestContent({
        since: since ? new Date(since as string) : undefined,
        limit: Number(limit)
      });

      // Filter by criteria
      let filteredContent = result.ingested;
      
      if (contentType) {
        filteredContent = filteredContent.filter(c => c.type === contentType);
      }
      
      if (category) {
        filteredContent = filteredContent.filter(c => c.category === category);
      }
      
      if (minRelevanceScore) {
        filteredContent = filteredContent.filter(c => c.relevanceScore >= Number(minRelevanceScore));
      }

      // Sort by relevance score and publication date
      filteredContent.sort((a, b) => {
        const relevanceSort = b.relevanceScore - a.relevanceScore;
        if (Math.abs(relevanceSort) < 0.1) {
          return b.publishedDate.getTime() - a.publishedDate.getTime();
        }
        return relevanceSort;
      });

      logger.info('Latest clinical content retrieved', {
        totalIngested: result.ingested.length,
        filtered: filteredContent.length,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          content: filteredContent.slice(0, Number(limit)),
          ingestionSummary: result.summary,
          filters: {
            contentType,
            category,
            minRelevanceScore,
            since
          },
          metadata: {
            totalAvailable: filteredContent.length,
            returned: Math.min(filteredContent.length, Number(limit)),
            lastIngestionTime: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get latest content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve latest clinical content',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * GET /api/content/relevant/:module
 * Get content relevant to a specific clinical module
 */
router.get('/relevant/:module',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director', 'physician', 'analyst']),
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('minRelevanceScore').optional().isFloat({ min: 0, max: 1 }),
    query('contentTypes').optional().isString(), // Comma-separated
    query('since').optional().isISO8601(),
    query('includeInsights').optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
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

      const moduleType = req.params.module;
      const {
        limit = 20,
        minRelevanceScore = 0.6,
        contentTypes,
        since,
        includeInsights = true
      } = req.query;

      const service = await initializeContentService();

      const options = {
        limit: Number(limit),
        minRelevanceScore: Number(minRelevanceScore),
        contentTypes: contentTypes ? (contentTypes as string).split(',') as any : undefined,
        since: since ? new Date(since as string) : undefined
      };

      const result = await service.getRelevantContent(moduleType, options);

      logger.info('Relevant content retrieved for module', {
        module: moduleType,
        contentCount: result.content.length,
        insightsCount: result.insights.length,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          module: moduleType,
          content: result.content,
          insights: includeInsights === 'true' ? result.insights : undefined,
          summary: result.summary,
          recommendations: {
            priorityActions: result.insights
              .filter(i => i.priority === 'high' || i.priority === 'critical')
              .map(i => i.title),
            relevantGuidelines: result.content
              .filter(c => c.type === 'guideline')
              .map(c => c.title),
            recentEvidence: result.content
              .filter(c => c.publishedDate > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
              .length
          }
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get relevant content for module', {
        error: error instanceof Error ? error.message : 'Unknown error',
        module: req.params.module,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve relevant clinical content',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * GET /api/content/guidelines/changes
 * Get recent guideline changes that may affect CQL rules
 */
router.get('/guidelines/changes',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director']),
  [
    query('since').optional().isISO8601(),
    query('organizations').optional().isString(), // Comma-separated
    query('significance').optional().isIn(['minor', 'moderate', 'major']),
    query('status').optional().isIn(['pending', 'confirmed', 'false-positive'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
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

      const {
        since,
        organizations,
        significance,
        status
      } = req.query;

      const service = await initializeContentService();

      const options = {
        since: since ? new Date(since as string) : undefined,
        organizations: organizations ? (organizations as string).split(',') : undefined
      };

      const result = await service.trackGuidelineChanges(options);

      // Filter by significance and status if specified
      let filteredChanges = result.changes;
      
      if (significance) {
        filteredChanges = filteredChanges.filter(c => c.changeSignificance === significance);
      }
      
      if (status) {
        filteredChanges = filteredChanges.filter(c => c.validationStatus === status);
      }

      logger.info('Guideline changes retrieved', {
        totalChanges: result.changes.length,
        filteredChanges: filteredChanges.length,
        impactedRules: result.impactedRules.length,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          changes: filteredChanges,
          impactedRules: result.impactedRules,
          recommendedActions: result.recommendedActions,
          summary: {
            totalChanges: filteredChanges.length,
            bySignificance: {
              major: filteredChanges.filter(c => c.changeSignificance === 'major').length,
              moderate: filteredChanges.filter(c => c.changeSignificance === 'moderate').length,
              minor: filteredChanges.filter(c => c.changeSignificance === 'minor').length
            },
            byStatus: {
              pending: filteredChanges.filter(c => c.validationStatus === 'pending').length,
              confirmed: filteredChanges.filter(c => c.validationStatus === 'confirmed').length,
              falsePositive: filteredChanges.filter(c => c.validationStatus === 'false-positive').length
            },
            urgentActions: filteredChanges.filter(c => 
              c.changeSignificance === 'major' && 
              c.implementationDeadline && 
              c.implementationDeadline < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ).length
          }
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get guideline changes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve guideline changes',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * GET /api/content/stats
 * Get content intelligence service statistics
 */
router.get('/stats',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director', 'analyst']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeContentService();
      const stats = await service.getServiceStatistics();

      logger.info('Content intelligence stats retrieved', {
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get content intelligence stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve content intelligence statistics',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Error handling middleware specific to content routes
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Content Intelligence API error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error in Content Intelligence API',
    timestamp: new Date().toISOString()
  });
});

export = router;