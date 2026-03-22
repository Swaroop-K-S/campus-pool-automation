import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/login';
import { ProtectedRoute } from './components/shared/protected-route';

import AdminLayout from './components/shared/AdminLayout';
import AdminDashboardPage from './pages/college-admin/dashboard';

// Stubs for the actual pages to be built in subsequent phases
const ErrorBoundary = () => <div>Something went wrong</div>;
const GenericDashboard = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p>Phase 2+ Feature stub.</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorBoundary />
  },
  {
    path: '/platform',
    element: <ProtectedRoute allowedRoles={['platform_admin']} />,
    children: [
      {
        path: '',
        element: <AdminLayout />,
        children: [
          { path: 'dashboard', element: <GenericDashboard title="Platform Dashboard" /> },
          { path: 'colleges', element: <GenericDashboard title="Colleges Management" /> },
          { path: 'settings', element: <GenericDashboard title="Platform Settings" /> }
        ]
      }
    ]
  },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['college_admin']} />,
    children: [
      {
        path: '',
        element: <AdminLayout />,
        children: [
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'drives/new', element: <GenericDashboard title="New Drive Wizard" /> },
          { path: 'drives/:id', element: <GenericDashboard title="Drive Details" /> },
          { path: 'drives', element: <GenericDashboard title="Placement Drives" /> },
          { path: 'users', element: <GenericDashboard title="Users Management" /> },
          { path: 'analytics', element: <GenericDashboard title="Analytics Overview" /> },
          { path: 'settings', element: <GenericDashboard title="Settings" /> },
        ]
      }
    ]
  },
  {
    path: '/hr',
    element: <ProtectedRoute allowedRoles={['company_hr']} />,
    children: [
      { path: 'dashboard', element: <GenericDashboard title="HR Dashboard" /> }
    ]
  },
  {
    path: '/invigilator',
    element: <ProtectedRoute allowedRoles={['invigilator']} />,
    children: [
      { path: 'dashboard', element: <GenericDashboard title="Invigilator Dashboard" /> }
    ]
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />
  }
]);
