import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, APIResponse } from '../types';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  hospital?: {
    id: string;
    name: string;
    patientCount: number;
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }

    req.user = user as JWTPayload;
    next();
  });
};

const authorizeHospital = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const hospitalId = req.params.hospitalId || req.query.hospitalId || req.user?.organizationId;
  
  if (!hospitalId) {
    return res.status(400).json({
      success: false,
      error: 'Hospital ID required',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  // Ensure user can only access their own hospital's data
  if (req.user?.organizationId !== hospitalId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Cannot access other hospital data',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  next();
};

const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied: Requires one of roles: ${allowedRoles.join(', ')}`,
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
    next();
  };
};

const authorizeModule = (allowedModules: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestedModule = req.params.moduleId || req.query.module;
    
    if (requestedModule && !allowedModules.includes(requestedModule)) {
      return res.status(403).json({
        success: false,
        error: `Access denied: No permission for module ${requestedModule}`,
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
    next();
  };
};

const authorizeView = (allowedViews: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestedView = req.params.viewType || req.query.view;
    
    if (requestedView && !allowedViews.includes(requestedView)) {
      return res.status(403).json({
        success: false,
        error: `Access denied: No permission for view ${requestedView}`,
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
    next();
  };
};

export {
  authenticateToken,
  authorizeHospital,
  authorizeRole,
  authorizeModule,
  authorizeView,
  AuthenticatedRequest
};