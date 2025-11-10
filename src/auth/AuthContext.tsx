import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { errorHandler, ErrorSeverity, ErrorCategory } from '../utils/ErrorHandler';

// User roles and permissions
export type UserRole = 'executive' | 'service-line' | 'care-team' | 'admin';

export interface Permission {
  module: string;
  action: 'read' | 'write' | 'admin';
  resource?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: string;
  permissions: Permission[];
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
      return {
        ...state,
        isLoading: true,
      };

    case 'LOGIN_SUCCESS':
      const sessionExpiry = new Date();
      sessionExpiry.setHours(sessionExpiry.getHours() + 8); // 8-hour session

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

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        loginAttempts: state.loginAttempts + 1,
        isLocked: state.loginAttempts >= 4, // Lock after 5 attempts
      };

    case 'LOGOUT':
      return {
        ...initialState,
      };

    case 'REFRESH_TOKEN_SUCCESS':
      const newExpiry = new Date();
      newExpiry.setHours(newExpiry.getHours() + 8);
      
      return {
        ...state,
        sessionToken: action.payload.sessionToken,
        sessionExpiry: newExpiry,
      };

    case 'REFRESH_TOKEN_FAILURE':
      return {
        ...initialState,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case 'LOCK_ACCOUNT':
      return {
        ...state,
        isLocked: true,
      };

    case 'RESET_LOGIN_ATTEMPTS':
      return {
        ...state,
        loginAttempts: 0,
        isLocked: false,
      };

    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string, mfaCode?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (module: string, action: string, resource?: string) => boolean;
  isSessionValid: () => boolean;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Role-based permissions configuration
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  executive: [
    { module: '*', action: 'read' },
    { module: 'reports', action: 'write' },
    { module: 'analytics', action: 'read' },
  ],
  'service-line': [
    { module: '*', action: 'read' },
    { module: 'patients', action: 'write' },
    { module: 'protocols', action: 'write' },
    { module: 'quality', action: 'write' },
  ],
  'care-team': [
    { module: 'patients', action: 'read' },
    { module: 'patients', action: 'write', resource: 'assigned' },
    { module: 'documentation', action: 'write' },
    { module: 'workflows', action: 'read' },
  ],
  admin: [
    { module: '*', action: 'admin' },
  ],
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (state.isAuthenticated && state.sessionExpiry) {
      const refreshTime = state.sessionExpiry.getTime() - Date.now() - (15 * 60 * 1000); // 15 min before expiry
      
      if (refreshTime > 0) {
        const timeoutId = setTimeout(() => {
          refreshToken();
        }, refreshTime);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [state.sessionExpiry, state.isAuthenticated]);

  // Session validation on app load
  useEffect(() => {
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
            payload: {
              user,
              sessionToken: savedToken,
              refreshToken: savedRefreshToken,
            },
          });
        } else {
          // Token expired, try to refresh
          refreshToken();
        }
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('tailrd-session-token');
        localStorage.removeItem('tailrd-refresh-token');
        localStorage.removeItem('tailrd-user');
      }
    }
  }, []);

  const login = async (email: string, password: string, mfaCode?: string): Promise<boolean> => {
    if (state.isLocked) {
      errorHandler.handlePermissionError('Account locked due to multiple failed login attempts');
      return false;
    }

    dispatch({ type: 'LOGIN_START' });

    try {
      // In production, this would call a real authentication API
      const response = await mockAuthAPI.login(email, password, mfaCode);

      if (response.success && response.user && response.sessionToken && response.refreshToken) {
        const user: User = {
          ...response.user,
          permissions: ROLE_PERMISSIONS[response.user.role] || [],
        };

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user,
            sessionToken: response.sessionToken,
            refreshToken: response.refreshToken,
          },
        });

        // Store session data securely
        localStorage.setItem('tailrd-session-token', response.sessionToken);
        localStorage.setItem('tailrd-refresh-token', response.refreshToken);
        localStorage.setItem('tailrd-user', JSON.stringify(user));
        localStorage.setItem('tailrd-user-id', user.id);

        return true;
      } else {
        const errorMessage = response.error || 'Login failed';
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
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout API to invalidate server-side session
      if (state.sessionToken) {
        await mockAuthAPI.logout(state.sessionToken);
      }
    } catch (error) {
      // Log error but continue with local logout
      console.warn('Logout API call failed:', error);
    }

    // Clear local storage
    localStorage.removeItem('tailrd-session-token');
    localStorage.removeItem('tailrd-refresh-token');
    localStorage.removeItem('tailrd-user');
    localStorage.removeItem('tailrd-user-id');

    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async (): Promise<boolean> => {
    const storedRefreshToken = state.refreshToken || localStorage.getItem('tailrd-refresh-token');
    
    if (!storedRefreshToken) {
      dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
      return false;
    }

    try {
      const response = await mockAuthAPI.refreshToken(storedRefreshToken);

      if (response.success) {
        dispatch({
          type: 'REFRESH_TOKEN_SUCCESS',
          payload: { sessionToken: response.sessionToken },
        });

        localStorage.setItem('tailrd-session-token', response.sessionToken);
        return true;
      } else {
        dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
      errorHandler.handleAPIError(error as Error, { action: 'Token Refresh' });
      return false;
    }
  };

  const updateUser = (updates: Partial<User>): void => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
    
    if (state.user) {
      const updatedUser = { ...state.user, ...updates };
      localStorage.setItem('tailrd-user', JSON.stringify(updatedUser));
    }
  };

  const hasPermission = (module: string, action: string, resource?: string): boolean => {
    if (!state.user) return false;

    return state.user.permissions.some(permission => {
      const moduleMatch = permission.module === '*' || permission.module === module;
      const actionMatch = permission.action === 'admin' || permission.action === action;
      const resourceMatch = !permission.resource || permission.resource === resource;

      return moduleMatch && actionMatch && resourceMatch;
    });
  };

  const isSessionValid = (): boolean => {
    if (!state.isAuthenticated || !state.sessionExpiry) return false;
    return state.sessionExpiry > new Date();
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    
    if (state.sessionToken) {
      headers['Authorization'] = `Bearer ${state.sessionToken}`;
    }

    return headers;
  };

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    refreshToken,
    updateUser,
    hasPermission,
    isSessionValid,
    getAuthHeaders,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock API for development - replace with real API calls in production
const mockAuthAPI = {
  login: async (email: string, password: string, mfaCode?: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock user data for different roles
    const mockUsers: Record<string, User> = {
      'executive@hospital.com': {
        id: 'exec-001',
        email: 'executive@hospital.com',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        role: 'executive',
        department: 'Cardiology Administration',
        permissions: ROLE_PERMISSIONS.executive,
        sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        mfaEnabled: true,
      },
      'serviceline@hospital.com': {
        id: 'sl-001',
        email: 'serviceline@hospital.com',
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        role: 'service-line',
        department: 'Heart Failure Service Line',
        permissions: ROLE_PERMISSIONS['service-line'],
        sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        mfaEnabled: true,
      },
      'careteam@hospital.com': {
        id: 'ct-001',
        email: 'careteam@hospital.com',
        firstName: 'Nurse Jane',
        lastName: 'Smith',
        role: 'care-team',
        department: 'Cardiovascular ICU',
        permissions: ROLE_PERMISSIONS['care-team'],
        sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        mfaEnabled: false,
      },
    };

    // Simulate authentication logic
    if (password === 'demo123' && mockUsers[email]) {
      return {
        success: true,
        user: mockUsers[email],
        sessionToken: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    // Simulate different error scenarios
    if (!mockUsers[email]) {
      return { success: false, error: 'User not found' };
    }

    return { success: false, error: 'Invalid password' };
  },

  logout: async (sessionToken: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },

  refreshToken: async (refreshToken: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate token refresh
    return {
      success: true,
      sessionToken: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  },
};