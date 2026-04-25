import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { errorHandler, ErrorSeverity, ErrorCategory } from '../utils/ErrorHandler';
import { DATA_SOURCE } from '../config/dataSource';
import { loginApi } from '../services/api';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Backend-aligned role type (7 roles) */
export type UserRole =
  | 'super-admin'
  | 'hospital-admin'
  | 'physician'
  | 'nurse-manager'
  | 'quality-director'
  | 'analyst'
  | 'viewer';

/** Legacy permission shape (kept for backward compat) */
export interface Permission {
  module: string;
  action: 'read' | 'write' | 'admin';
  resource?: string;
}

/** Backend-aligned permissions shape */
export interface UserPermissions {
  modules: {
    heartFailure: boolean;
    electrophysiology: boolean;
    structuralHeart: boolean;
    coronaryIntervention: boolean;
    peripheralVascular: boolean;
    valvularDisease: boolean;
    research: boolean;
  };
  views: {
    executive: boolean;
    serviceLines: boolean;
    careTeam: boolean;
  };
  actions: {
    viewReports: boolean;
    exportData: boolean;
    manageUsers: boolean;
    configureAlerts: boolean;
    accessPHI: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  role: UserRole;
  department: string;
  hospitalId?: string;
  hospitalName?: string;
  /** Legacy permission array (for backward compat) */
  permissions: Permission[];
  /** Backend-aligned permissions object */
  backendPermissions: UserPermissions;
  lastLogin?: string;
  sessionExpiry: string;
  mfaEnabled: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken: string | null;
  refreshToken: string | null;
  sessionExpiry: Date | null;
  loginAttempts: number;
  isLocked: boolean;
  lockoutUntil: number | null; // Unix ms timestamp — null means not locked
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; sessionToken: string; refreshToken: string } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: { sessionToken: string } }
  | { type: 'REFRESH_TOKEN_FAILURE' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'LOCK_ACCOUNT' }
  | { type: 'RESET_LOGIN_ATTEMPTS' };

// ─── Full-access defaults for demo mode ────────────────────────────────────────

const FULL_ACCESS_PERMISSIONS: UserPermissions = {
  modules: {
    heartFailure: true,
    electrophysiology: true,
    structuralHeart: true,
    coronaryIntervention: true,
    peripheralVascular: true,
    valvularDisease: true,
    research: true,
  },
  views: { executive: true, serviceLines: true, careTeam: true },
  actions: {
    viewReports: true,
    exportData: true,
    manageUsers: true,
    configureAlerts: true,
    accessPHI: true,
  },
};

/** Legacy role-based permissions (backward compat for hasPermission) */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'super-admin': [{ module: '*', action: 'admin' }],
  'hospital-admin': [
    { module: '*', action: 'read' },
    { module: '*', action: 'write' },
  ],
  physician: [
    { module: '*', action: 'read' },
    { module: 'patients', action: 'write', resource: 'assigned' },
  ],
  'nurse-manager': [
    { module: 'patients', action: 'read' },
    { module: 'patients', action: 'write', resource: 'assigned' },
  ],
  'quality-director': [
    { module: '*', action: 'read' },
    { module: 'reports', action: 'write' },
    { module: 'quality', action: 'write' },
  ],
  analyst: [
    { module: '*', action: 'read' },
    { module: 'analytics', action: 'read' },
  ],
  viewer: [{ module: '*', action: 'read' }],
  // Legacy roles (map to admin for backward compat)
  admin: [{ module: '*', action: 'admin' }],
  executive: [{ module: '*', action: 'read' }, { module: 'reports', action: 'write' }],
  'service-line': [{ module: '*', action: 'read' }, { module: 'patients', action: 'write' }],
  'care-team': [{ module: 'patients', action: 'read' }, { module: 'patients', action: 'write', resource: 'assigned' }],
};

// ─── Reducer ───────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  sessionToken: null,
  refreshToken: null,
  sessionExpiry: null,
  loginAttempts: 0,
  isLocked: false,
  lockoutUntil: null,
};

// Session duration: 4 hours in demo, 8 hours in dev (production should set REACT_APP_SESSION_TIMEOUT_MS)
const SESSION_DURATION_MS = process.env.REACT_APP_SESSION_TIMEOUT_MS
  ? parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MS, 10)
  : isDemoMode
  ? 4 * 60 * 60 * 1000   // 4 hours for demo
  : 8 * 60 * 60 * 1000;  // 8 hours for dev (production .env should set 30 min)

// Cryptographically secure token generator
function generateSecureToken(byteLength = 32): string {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

// The one account that gets super-admin + backend access
const SUPER_ADMIN_EMAIL = 'jhart@tailrd-heart.com';

// Full demo permissions — all modules and views, no admin console
const DEMO_ACCESS_PERMISSIONS: UserPermissions = {
  modules: {
    heartFailure: true,
    electrophysiology: true,
    structuralHeart: true,
    coronaryIntervention: true,
    peripheralVascular: true,
    valvularDisease: true,
    research: true,
  },
  views: { executive: true, serviceLines: true, careTeam: true },
  actions: {
    viewReports: true,
    exportData: true,
    manageUsers: false,
    configureAlerts: false,
    accessPHI: false,
  },
};

/** Derive a display name from an email address (e.g. "john.hart@x.com" → "John Hart") */
function nameFromEmail(email: string): { firstName: string; lastName: string } {
  const local = email.split('@')[0] || 'User';
  const parts = local.replace(/[._-]+/g, ' ').split(' ').filter(Boolean);
  const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return {
    firstName: capitalise(parts[0] || 'Demo'),
    lastName: parts.length > 1 ? capitalise(parts[parts.length - 1]) : 'User',
  };
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };

    case 'LOGIN_SUCCESS': {
      const sessionExpiry = new Date(Date.now() + SESSION_DURATION_MS);
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        sessionToken: action.payload.sessionToken,
        refreshToken: action.payload.refreshToken,
        sessionExpiry,
        loginAttempts: 0,
        isLocked: false,
        lockoutUntil: null,
      };
    }

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        loginAttempts: state.loginAttempts + 1,
        isLocked: state.loginAttempts >= 4,
      };

    case 'LOGOUT':
      return { ...initialState };

    case 'REFRESH_TOKEN_SUCCESS': {
      const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
      return {
        ...state,
        sessionToken: action.payload.sessionToken,
        sessionExpiry: newExpiry,
      };
    }

    case 'REFRESH_TOKEN_FAILURE':
      return { ...initialState };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case 'LOCK_ACCOUNT':
      return { ...state, isLocked: true, lockoutUntil: Date.now() + 30 * 60 * 1000 };

    case 'RESET_LOGIN_ATTEMPTS':
      return { ...state, loginAttempts: 0, isLocked: false, lockoutUntil: null };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string, mfaCode?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (module: string, action: string, resource?: string) => boolean;
  hasModuleAccess: (moduleKey: string) => boolean;
  hasViewAccess: (viewKey: string) => boolean;
  isSessionValid: () => boolean;
  getAuthHeaders: () => Record<string, string>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Normalize the role string from backend (Prisma SCREAMING_SNAKE_CASE) to the
 * frontend's kebab-case UserRole convention.
 *
 * TECH DEBT — TEMPORARY BRIDGE:
 * The Prisma enum value `SUPER_ADMIN` arrives via JWT/API and the frontend's
 * `UserRole` type expects `'super-admin'`. Without this normalization, every
 * `role === 'super-admin'` comparison and every `ROLE_PERMISSIONS[role]`
 * lookup silently returns false/undefined, which causes the SUPER_ADMIN admin
 * console gate to fail with "Permission Denied" even though the user IS a
 * super-admin in the DB.
 *
 * This helper is the data-ingress translator for now. It will be removed in
 * tech debt #21 (PR 2 of Phase 2-A split — refactor/standardize-role-convention)
 * which standardizes the entire codebase on SCREAMING_SNAKE_CASE.
 *
 * Mirrors the pattern at backend/src/middleware/auth.ts:148 (the existing
 * authorizeRole normalizer that has been doing the same translation
 * server-side for ~150 backend code sites).
 *
 * Defensive: handles null/undefined and already-kebab-case input.
 */
function normalizeRole(raw: string | null | undefined): UserRole {
  if (!raw) return 'viewer';
  const lower = String(raw).toLowerCase().replace(/_/g, '-');
  return lower as UserRole;
}

/** Build a User object from backend API response */
function buildUserFromResponse(apiUser: Record<string, any>, backendPerms?: UserPermissions): User {
  const role = normalizeRole(apiUser.role);
  const bp = backendPerms || apiUser.permissions || FULL_ACCESS_PERMISSIONS;

  return {
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    title: apiUser.title,
    role,
    department: apiUser.department || apiUser.title || '',
    hospitalId: apiUser.hospitalId,
    hospitalName: apiUser.hospitalName,
    permissions: ROLE_PERMISSIONS[role] || [],
    backendPermissions: bp,
    sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    mfaEnabled: false,
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── On startup: clear any stale demo tokens so login is always required ──
  useEffect(() => {
    localStorage.removeItem('tailrd-session-token');
    localStorage.removeItem('tailrd-refresh-token');
    localStorage.removeItem('tailrd-user');
    localStorage.removeItem('tailrd-user-id');
  }, []);

  // ── Auto-refresh token before expiry ──
  useEffect(() => {
    if (state.isAuthenticated && state.sessionExpiry) {
      const refreshTime = state.sessionExpiry.getTime() - Date.now() - 15 * 60 * 1000;
      if (refreshTime > 0) {
        const timeoutId = setTimeout(() => {
          refreshTokenFn();
        }, refreshTime);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [state.sessionExpiry, state.isAuthenticated]);

  // ── Session restoration on app load (non-demo) ──
  useEffect(() => {
    if (isDemoMode) return; // Demo mode auto-logins above

    const savedToken = localStorage.getItem('tailrd-session-token');
    const savedRefreshToken = localStorage.getItem('tailrd-refresh-token');
    const savedUser = localStorage.getItem('tailrd-user');

    if (savedToken && savedRefreshToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const tokenExpiry = new Date(user.sessionExpiry);

        if (tokenExpiry > new Date()) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, sessionToken: savedToken, refreshToken: savedRefreshToken },
          });
        } else {
          refreshTokenFn();
        }
      } catch {
        localStorage.removeItem('tailrd-session-token');
        localStorage.removeItem('tailrd-refresh-token');
        localStorage.removeItem('tailrd-user');
      }
    }
  }, []);

  // ── Login ──
  const login = useCallback(async (email: string, password: string, _mfaCode?: string): Promise<boolean> => {
    // Check lockout with auto-expiry
    if (state.isLocked) {
      if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
        const minsLeft = Math.ceil((state.lockoutUntil - Date.now()) / 60000);
        errorHandler.handlePermissionError(`Account locked. Try again in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.`);
        return false;
      }
      // Lockout period expired — auto-unlock
      dispatch({ type: 'RESET_LOGIN_ATTEMPTS' });
    }

    dispatch({ type: 'LOGIN_START' });

    if (!email || !password) {
      dispatch({ type: 'LOGIN_FAILURE', payload: { error: 'Please enter your email and password.' } });
      return false;
    }

    // Real API login when not in demo mode
    if (DATA_SOURCE.useRealApi && !isDemoMode) {
      try {
        const response = await loginApi(email, password);
        if (response.success) {
          const user = buildUserFromResponse(response.data.user, response.data.permissions as any);
          const sessionToken = response.data.token;
          const refreshToken = response.data.refreshToken;

          localStorage.setItem('tailrd-session-token', sessionToken);
          localStorage.setItem('tailrd-refresh-token', refreshToken);
          localStorage.setItem('tailrd-user', JSON.stringify(user));

          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, sessionToken, refreshToken } });
          return true;
        }
        // Backend returned 2xx with success:false — surface the message.
        throw new Error(response.message || 'Login failed');
      } catch (error) {
        // Re-throw so the caller (Login.tsx handleSubmit) can show a toast.
        // Previously this catch swallowed errors and returned false, which
        // produced the "nothing happens on click" UX bug — every login failure
        // (wrong password, unknown email, network error, CORS rejection)
        // was invisible to the user.
        const message = error instanceof Error
          ? error.message
          : 'Unable to reach login service';
        dispatch({ type: 'LOGIN_FAILURE', payload: { error: message } });
        throw error instanceof Error ? error : new Error(message);
      }
    }

    // ── Demo mode ──
    // Simulate network latency for realism
    await new Promise((resolve) => setTimeout(resolve, 600));

    const normalizedEmail = email.toLowerCase().trim();
    const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;
    const { firstName, lastName } = isSuperAdmin
      ? { firstName: 'Jeff', lastName: 'Hart' }
      : nameFromEmail(normalizedEmail);

    const role: UserRole = isSuperAdmin ? 'super-admin' : 'hospital-admin';

    const user: User = {
      id: isSuperAdmin ? 'jhart-superadmin' : `demo-${normalizedEmail}`,
      email: normalizedEmail,
      firstName,
      lastName,
      title: isSuperAdmin ? 'Platform Administrator' : 'Demo User',
      role,
      department: isSuperAdmin ? 'TAILRD Administration' : 'Cardiovascular Services',
      permissions: ROLE_PERMISSIONS[role] || [],
      backendPermissions: isSuperAdmin ? FULL_ACCESS_PERMISSIONS : DEMO_ACCESS_PERMISSIONS,
      sessionExpiry: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
      mfaEnabled: false,
    };

    const sessionToken = generateSecureToken();
    const refreshToken = generateSecureToken();

    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, sessionToken, refreshToken } });
    return true;
  }, [state.isLocked, state.lockoutUntil]);

  // ── Logout ──
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (!isDemoMode && state.sessionToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${state.sessionToken}` },
        });
      }
    } catch {
      console.warn('Logout API call failed');
    }

    localStorage.removeItem('tailrd-session-token');
    localStorage.removeItem('tailrd-refresh-token');
    localStorage.removeItem('tailrd-user');
    localStorage.removeItem('tailrd-user-id');
    dispatch({ type: 'LOGOUT' });
  }, [state.sessionToken]);

  // ── Refresh token ──
  const refreshTokenFn = useCallback(async (): Promise<boolean> => {
    const storedToken = state.sessionToken || localStorage.getItem('tailrd-session-token');
    if (!storedToken) {
      dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
      return false;
    }

    try {
      if (isDemoMode) {
        const newToken = generateSecureToken();
        dispatch({ type: 'REFRESH_TOKEN_SUCCESS', payload: { sessionToken: newToken } });
        localStorage.setItem('tailrd-session-token', newToken);
        return true;
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      const data = await response.json();
      if (data.success && data.data?.token) {
        dispatch({ type: 'REFRESH_TOKEN_SUCCESS', payload: { sessionToken: data.data.token } });
        localStorage.setItem('tailrd-session-token', data.data.token);
        return true;
      } else {
        dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
        return false;
      }
    } catch {
      dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
      return false;
    }
  }, [state.sessionToken]);

  // ── Permission helpers ──

  const hasPermission = useCallback((module: string, action: string, resource?: string): boolean => {
    if (!state.user) return false;
    // Always check actual role permissions — demo mode does not bypass this
    return state.user.permissions.some((p) => {
      const moduleMatch = p.module === '*' || p.module === module;
      const actionMatch = p.action === 'admin' || p.action === action;
      const resourceMatch = !p.resource || p.resource === resource;
      return moduleMatch && actionMatch && resourceMatch;
    });
  }, [state.user]);

  const hasModuleAccess = useCallback((moduleKey: string): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    // Super admin and hospital admin have full module access
    if (state.user.role === 'super-admin' || state.user.role === 'hospital-admin') return true;
    // Check user's backend permissions if available
    if (state.user.backendPermissions) {
      const modulePermMap: Record<string, keyof UserPermissions['modules']> = {
        'hf': 'heartFailure',
        'heartFailure': 'heartFailure',
        'ep': 'electrophysiology',
        'electrophysiology': 'electrophysiology',
        'cad': 'coronaryIntervention',
        'coronary': 'coronaryIntervention',
        'coronaryIntervention': 'coronaryIntervention',
        'sh': 'structuralHeart',
        'structural': 'structuralHeart',
        'structuralHeart': 'structuralHeart',
        'vd': 'valvularDisease',
        'valvular': 'valvularDisease',
        'valvularDisease': 'valvularDisease',
        'pv': 'peripheralVascular',
        'peripheral': 'peripheralVascular',
        'peripheralVascular': 'peripheralVascular',
        'research': 'research',
      };
      const permKey = modulePermMap[moduleKey];
      if (permKey && state.user.backendPermissions.modules[permKey] !== undefined) {
        return state.user.backendPermissions.modules[permKey] === true;
      }
    }
    // Fail closed in production; fail open only in demo mode
    return isDemoMode;
  }, [state.user, state.isAuthenticated]);

  const hasViewAccess = useCallback((viewKey: string): boolean => {
    if (!state.user || !state.isAuthenticated) return false;
    if (state.user.role === 'super-admin' || state.user.role === 'hospital-admin') return true;
    if (state.user.backendPermissions) {
      const viewPermMap: Record<string, keyof UserPermissions['views']> = {
        'executive': 'executive',
        'serviceLine': 'serviceLines',
        'service-line': 'serviceLines',
        'serviceLines': 'serviceLines',
        'careTeam': 'careTeam',
        'care-team': 'careTeam',
      };
      const permKey = viewPermMap[viewKey];
      if (permKey && state.user.backendPermissions.views[permKey] !== undefined) {
        return state.user.backendPermissions.views[permKey] === true;
      }
    }
    // Fail closed in production; fail open only in demo mode
    return isDemoMode;
  }, [state.user, state.isAuthenticated]);

  const isSessionValid = useCallback((): boolean => {
    if (!state.isAuthenticated) return false;
    if (!state.sessionExpiry) return true;
    return state.sessionExpiry > new Date();
  }, [state.isAuthenticated, state.sessionExpiry]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (state.sessionToken) {
      headers['Authorization'] = `Bearer ${state.sessionToken}`;
    }
    return headers;
  }, [state.sessionToken]);

  const updateUser = useCallback((updates: Partial<User>): void => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
    if (state.user) {
      const updatedUser = { ...state.user, ...updates };
      localStorage.setItem('tailrd-user', JSON.stringify(updatedUser));
    }
  }, [state.user]);

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    refreshToken: refreshTokenFn,
    updateUser,
    hasPermission,
    hasModuleAccess,
    hasViewAccess,
    isSessionValid,
    getAuthHeaders,
    isDemoMode: !!isDemoMode,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
