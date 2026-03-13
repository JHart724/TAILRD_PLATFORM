import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from './AuthContext';
import { ErrorBoundary } from '../components/shared/ErrorFallback';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  /** Backend-aligned module key (e.g. 'heartFailure', 'structuralHeart') */
  requiredModule?: string;
  /** Backend-aligned view key (e.g. 'executive', 'serviceLines', 'careTeam') */
  requiredView?: string;
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
  requiredModule,
  requiredView,
  requiredPermissions = [],
  fallback,
}) => {
  const { state, hasPermission, hasModuleAccess, hasViewAccess, isSessionValid, isDemoMode } = useAuth();
  const location = useLocation();

  // Loading state — also covers demo mode before auto-login useEffect fires
  if (state.isLoading || (isDemoMode && !state.isAuthenticated)) {
    return (
      <div className="min-h-screen app-surface flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-chrome-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-chrome-400 rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
          <div className="text-lg text-chrome-300 font-medium">
            Verifying authentication...
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated (production only — demo mode handled above)
  if (!state.isAuthenticated || !isSessionValid()) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Account locked
  if (state.isLocked) {
    return (
      <div className="min-h-screen app-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="glass-panel-elevated p-8 text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
              style={{ background: 'rgba(212, 42, 62, 0.12)', border: '1px solid rgba(212, 42, 62, 0.2)' }}
            >
              <Lock className="w-8 h-8 text-arterial-400" />
            </div>
            <h1 className="text-2xl font-bold text-chrome-100 mb-4">Account Locked</h1>
            <p className="text-chrome-400 mb-6">
              Your account has been temporarily locked due to multiple failed login attempts.
            </p>
            <p className="text-sm text-chrome-500">
              Please contact IT Support at ext. 4357 to unlock your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Role-based access control ──
  // Demo mode: bypass all role/module/view checks
  if (!isDemoMode) {
    // Module-level access check
    if (requiredModule && !hasModuleAccess(requiredModule)) {
      return renderAccessDenied('module', requiredModule);
    }

    // View-level access check
    if (requiredView && !hasViewAccess(requiredView)) {
      return renderAccessDenied('view', requiredView);
    }
  }

  // Permission-based access control (works in both modes, but demo always returns true)
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((permission) =>
      hasPermission(permission.module, permission.action, permission.resource)
    );

    if (!hasAllPermissions) {
      return (
        (fallback as JSX.Element) ||
        renderPermissionDenied(requiredPermissions)
      );
    }
  }

  // Access granted
  return (
    <ErrorBoundary
      module="Protected Route"
      component={`RequiredRole: ${requiredRole || 'Any'}`}
    >
      {children}
    </ErrorBoundary>
  );
};

// ── Access denied UI helpers ──

function renderAccessDenied(type: string, resource: string) {
  return (
    <div className="min-h-screen app-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="glass-panel-elevated p-8 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ background: 'rgba(212, 42, 62, 0.12)', border: '1px solid rgba(212, 42, 62, 0.2)' }}
          >
            <Shield className="w-8 h-8 text-arterial-400" />
          </div>
          <h1 className="text-2xl font-bold text-chrome-100 mb-4">Access Restricted</h1>
          <p className="text-chrome-400 mb-6">
            You don't have access to this {type}. Contact your administrator to request access.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 btn-secondary rounded-xl"
            >
              Go Back
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex-1 btn-primary rounded-xl"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderPermissionDenied(
  permissions: Array<{ module: string; action: string; resource?: string }>
) {
  return (
    <div className="min-h-screen app-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="glass-panel-elevated p-8 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
          >
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-chrome-100 mb-4">Permission Denied</h1>
          <p className="text-chrome-400 mb-4">
            You don't have the required permissions to access this resource.
          </p>
          <div className="text-left rounded-xl p-4 mb-6" style={{ background: 'rgba(212, 42, 62, 0.08)', border: '1px solid rgba(212, 42, 62, 0.15)' }}>
            <div className="text-sm font-semibold text-arterial-400 mb-2">Required permissions:</div>
            <ul className="text-xs text-arterial-300 space-y-1">
              {permissions.map((perm, index) => (
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
              className="flex-1 btn-secondary rounded-xl"
            >
              Go Back
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex-1 btn-primary rounded-xl"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  <ProtectedRoute requiredView="executive">{children}</ProtectedRoute>
);

export const ServiceLineRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredView="serviceLines">{children}</ProtectedRoute>
);

export const CareTeamRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredView="careTeam">{children}</ProtectedRoute>
);

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredPermissions={[{ module: '*', action: 'admin' }]}>{children}</ProtectedRoute>
);

export default ProtectedRoute;
