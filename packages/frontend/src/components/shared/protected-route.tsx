import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, accessToken } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If logged in but wrong role, redirect to their actual dashboard
    switch (user.role) {
      case 'platform_admin': return <Navigate to="/platform/dashboard" replace />;
      case 'college_admin': return <Navigate to="/admin/dashboard" replace />;
      case 'company_hr': return <Navigate to="/hr/dashboard" replace />;
      case 'invigilator': return <Navigate to="/invigilator/dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  // Render child routes
  return <Outlet />;
};
