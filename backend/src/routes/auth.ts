import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { APIResponse, JWTPayload, UserPermissions } from '../types';

const router = Router();

// Demo users for testing multi-tenancy
const demoUsers = [
  {
    id: 'user-000',
    email: 'superadmin@tailrd.com',
    password: 'admin123', // In production, this would be hashed
    firstName: 'Platform',
    lastName: 'Administrator',
    title: 'Super Administrator',
    role: 'super-admin',
    hospitalId: null,
    hospitalName: 'TAILRD Platform',
    permissions: {
      modules: {
        heartFailure: true,
        electrophysiology: true,
        structuralHeart: true,
        coronaryIntervention: true,
        peripheralVascular: true,
        valvularDisease: true
      },
      views: {
        executive: true,
        serviceLines: true,
        careTeam: true
      },
      actions: {
        viewReports: true,
        exportData: true,
        manageUsers: true,
        configureAlerts: true,
        accessPHI: true
      }
    } as UserPermissions
  },
  {
    id: 'user-001',
    email: 'admin@stmarys.org',
    password: 'demo123', // In production, this would be hashed
    firstName: 'Sarah',
    lastName: 'Johnson',
    title: 'Chief Medical Officer',
    role: 'hospital-admin',
    hospitalId: 'hosp-001',
    hospitalName: 'St. Mary\'s Regional Medical Center',
    permissions: {
      modules: {
        heartFailure: true,
        electrophysiology: true,
        structuralHeart: true,
        coronaryIntervention: true,
        peripheralVascular: true,
        valvularDisease: true
      },
      views: {
        executive: true,
        serviceLines: true,
        careTeam: true
      },
      actions: {
        viewReports: true,
        exportData: true,
        manageUsers: true,
        configureAlerts: true,
        accessPHI: true
      }
    } as UserPermissions
  },
  {
    id: 'user-002',
    email: 'cardio@stmarys.org',
    password: 'demo123',
    firstName: 'Dr. Michael',
    lastName: 'Chen',
    title: 'Interventional Cardiologist',
    role: 'physician',
    hospitalId: 'hosp-001',
    hospitalName: 'St. Mary\'s Regional Medical Center',
    permissions: {
      modules: {
        heartFailure: true,
        electrophysiology: false,
        structuralHeart: true,
        coronaryIntervention: true,
        peripheralVascular: false,
        valvularDisease: false
      },
      views: {
        executive: false,
        serviceLines: true,
        careTeam: true
      },
      actions: {
        viewReports: true,
        exportData: false,
        manageUsers: false,
        configureAlerts: false,
        accessPHI: true
      }
    } as UserPermissions
  },
  {
    id: 'user-003',
    email: 'admin@community.org',
    password: 'demo123',
    firstName: 'Lisa',
    lastName: 'Rodriguez',
    title: 'Quality Director',
    role: 'quality-director',
    hospitalId: 'hosp-002',
    hospitalName: 'Community General Hospital',
    permissions: {
      modules: {
        heartFailure: true,
        electrophysiology: false,
        structuralHeart: false,
        coronaryIntervention: true,
        peripheralVascular: true,
        valvularDisease: false
      },
      views: {
        executive: true,
        serviceLines: true,
        careTeam: false
      },
      actions: {
        viewReports: true,
        exportData: true,
        manageUsers: false,
        configureAlerts: true,
        accessPHI: false
      }
    } as UserPermissions
  }
];

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password required',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  const user = demoUsers.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    hospitalId: user.hospitalId,
    hospitalName: user.hospitalName,
    permissions: user.permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        title: user.title,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: user.hospitalName,
        permissions: user.permissions
      }
    },
    message: 'Login successful',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

// GET /api/auth/demo-users - For testing purposes
router.get('/demo-users', (req, res) => {
  const publicUsers = demoUsers.map(user => ({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.title,
    role: user.role,
    hospitalName: user.hospitalName,
    // Note: password is 'demo123' for all users in demo
  }));

  res.json({
    success: true,
    data: publicUsers,
    message: 'Demo users for testing (password: demo123)',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token required',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }

    res.json({
      success: true,
      data: decoded,
      message: 'Token valid',
      timestamp: new Date().toISOString()
    } as APIResponse);
  });
});

export = router;