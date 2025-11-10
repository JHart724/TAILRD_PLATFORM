import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  requireSuperAdmin = false 
}) => {
  const authToken = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  
  if (!authToken || !userData) {
    return <Navigate to="/" replace />;
  }
  
  if (requireSuperAdmin) {
    try {
      const user = JSON.parse(userData);
      if (user.role !== 'super-admin') {
        return <Navigate to="/dashboard" replace />;
      }
    } catch {
      return <Navigate to="/" replace />;
    }
  }
  
  return <>{children}</>;
};

export default PrivateRoute;