import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { errorHandler, ErrorSeverity, ErrorCategory } from '../utils/ErrorHandler';

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
  'hospital-admin': [{ module: '*', action: 'admin' }],
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
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };

    case 'LOGIN_SUCCESS': {
      const sessionExpiry = new Date();
      sessionExpiry.setHours(sessionExpiry.getHours() + 8);
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
      const newExpiry = new Date();
      newExpiry.setHours(newExpiry.getHours() + 8);
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
      return { ...state, isLocked: true };

    case 'RESET_LOGIN_ATTEMPTS':
      return { ...state, loginAttempts: 0, isLocked: false };

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

/** Build a User object from backend API response */
function buildUserFromResponse(apiUser: any, backendPerms?: UserPermissions): User {
  const role = (apiUser.role || 'viewer') as UserRole;
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

  // ── Demo mode auto-login ──
  useEffect(() => {
    if (isDemoMode && !state.isAuthenticated && !state.isLoading) {
      const demoUser: User = {
        id: 'demo-001',
        email: 'demo@tailrd.com',
        firstName: 'Dr. Smith',
        lastName: 'Demo',
        title: 'Platform Administrator',
        role: 'super-admin',
        department: 'All Departments',
        hospitalId: 'demo-hospital',
        hospitalName: 'TAILRD Demo',
        permissions: ROLE_PERMISSIONS['super-admin'],
        backendPermissions: FULL_ACCESS_PERMISSIONS,
        sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        mfaEnabled: false,
      };

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: demoUser,
          sessionToken: `demo_${Date.now()}`,
          refreshToken: `demo_refresh_${Date.now()}`,
        },
      });
    }
  }, [state.isAuthenticated, state.isLoading]);

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
    if (state.isLocked) {
      errorHandler.handlePermissionError('Account locked due to multiple failed login attempts');
      return false;
    }

    dispatch({ type: 'LOGIN_START' });

    try {
      if (isDemoMode) {
        // Demo mode: mock login (accept demo123, return admin)
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (password !== 'demo123' || !email) {
          dispatch({ type: 'LOGIN_FAILURE', payload: { error: 'Invalid password (use demo123)' } });
          return false;
        }

        const user: User = {
          id: 'demo-001',
          email,
          firstName: 'Dr. Admin',
          lastName: 'User',
          role: 'super-admin',
          department: 'All Departments',
          permissions: ROLE_PERMISSIONS['super-admin'],
          backendPermissions: FULL_ACCESS_PERMISSIONS,
          sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          mfaEnabled: false,
        };

        const sessionToken = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const refreshToken = `demo_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, sessionToken, refreshToken } });
        localStorage.setItem('tailrd-session-token', sessionToken);
        localStorage.setItem('tailrd-refresh-token', refreshToken);
        localStorage.setItem('tailrd-user', JSON.stringify(user));
        return true;
      }

      // Production mode: real API call
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const { token, user: apiUser } = data.data;
        const user = buildUserFromResponse(apiUser);

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, sessionToken: token, refreshToken: token },
        });

        localStorage.setItem('tailrd-session-token', token);
        localStorage.setItem('tailrd-refresh-token', token);
        localStorage.setItem('tailrd-user', JSON.stringify(user));
        localStorage.setItem('tailrd-user-id', user.id);
        return true;
      } else {
        const errorMessage = data.error || 'Login failed';
        dispatch({ type: 'LOGIN_FAILURE', payload: { error: errorMessage } });
        errorHandler.createError({
          message: `Login failed: ${errorMessage}`,
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.AUTHENTICATION,
          isRecoverable: true,
          userMessage: errorMessage,
          context: { action: 'Login Attempt' },
        });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: { error: 'Network error' } });
      errorHandler.handleAPIError(error as Error, { action: 'Login Request' });
      return false;
    }
  }, [state.isLocked]);

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
        const newToken = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    if (isDemoMode) return true;
    if (!state.user) return false;
    return state.user.permissions.some((p) => {
      const moduleMatch = p.module === '*' || p.module === module;
      const actionMatch = p.action === 'admin' || p.action === action;
      const resourceMatch = !p.resource || p.resource === resource;
      return moduleMatch && actionMatch && resourceMatch;
    });
  }, [state.user]);

  const hasModuleAccess = useCallback((moduleKey: string): boolean => {
    return true;
  }, [state.user]);

  const hasViewAccess = useCallback((viewKey: string): boolean => {
    return true;
  }, [state.user]);

  const isSessionValid = useCallback((): boolean => {
    if (isDemoMode) return true;
    if (!state.isAuthenticated || !state.sessionExpiry) return false;
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
