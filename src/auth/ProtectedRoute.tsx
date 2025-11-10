import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from './AuthContext';
import { ErrorBoundary } from '../components/shared/ErrorFallback';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermissions?: Array<{
    module: string;
    action: string;
    resource?: string;
  }>;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermissions = [],
  fallback,
}) => {
  const { state, hasPermission, isSessionValid } = useAuth();
  const location = useLocation();

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-medical-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-medical-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
          <div className="text-lg text-steel-600 font-medium">
            Verifying authentication...
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!state.isAuthenticated || !isSessionValid()) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Account locked
  if (state.isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50/30 to-yellow-50/20 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-red-200/50 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-steel-900 mb-4">Account Locked</h1>
            <p className="text-steel-600 mb-6">
              Your account has been temporarily locked due to multiple failed login attempts.
            </p>
            <p className="text-sm text-steel-500">
              Please contact IT Support at ext. 4357 to unlock your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based access control
  if (requiredRole && state.user?.role !== requiredRole) {
    const roleNames: Record<UserRole, string> = {
      executive: 'Executive',
      'service-line': 'Service Line',
      'care-team': 'Care Team',
      admin: 'Administrator',
    };

    return (fallback as JSX.Element) || (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-red-50/20 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-amber-200/50 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-6">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-steel-900 mb-4">Access Restricted</h1>
            <p className="text-steel-600 mb-4">
              This area requires <strong>{roleNames[requiredRole]}</strong> access level.
            </p>
            <p className="text-sm text-steel-500 mb-6">
              Your current role: <strong>{roleNames[state.user?.role || 'care-team']}</strong>
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Permission-based access control
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission =>
      hasPermission(permission.module, permission.action, permission.resource)
    );

    if (!hasAllPermissions) {
      return (fallback as JSX.Element) || (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50/30 to-yellow-50/20 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-red-200/50 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-steel-900 mb-4">Permission Denied</h1>
              <p className="text-steel-600 mb-4">
                You don't have the required permissions to access this resource.
              </p>
              <div className="text-left bg-red-50 rounded-xl p-4 mb-6">
                <div className="text-sm font-semibold text-red-900 mb-2">Required permissions:</div>
                <ul className="text-xs text-red-700 space-y-1">
                  {requiredPermissions.map((perm, index) => (
                    <li key={index}>
                      • {perm.module}:{perm.action}
                      {perm.resource && ` (${perm.resource})`}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 px-4 py-2 bg-steel-600 text-white rounded-xl hover:bg-steel-700 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1 px-4 py-2 bg-medical-blue-600 text-white rounded-xl hover:bg-medical-blue-700 transition-colors"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Access granted - render children with error boundary
  return (
    <ErrorBoundary
      module="Protected Route"
      component={`RequiredRole: ${requiredRole || 'Any'}`}
    >
      {children}
    </ErrorBoundary>
  );
};

// Higher-order component for easy route protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  protection?: Omit<ProtectedRouteProps, 'children'>
) {
  const ProtectedComponent = (props: P) => (
    <ProtectedRoute {...protection}>
      <Component {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
}

// Specific protection components for common use cases
export const ExecutiveRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="executive">
    {children}
  </ProtectedRoute>
);

export const ServiceLineRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="service-line">
    {children}
  </ProtectedRoute>
);

export const CareTeamRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="care-team">
    {children}
  </ProtectedRoute>
);

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="admin">
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;