import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/login';
import { ProtectedRoute } from './components/shared/protected-route';
import AdminLayout from './components/shared/AdminLayout';

// Admin pages
import AdminDashboardPage from './pages/college-admin/dashboard';
import DrivesListPage from './pages/college-admin/drives-list';
import NewDriveWizard from './pages/college-admin/new-drive';
import DriveDetailPage from './pages/college-admin/drive-detail';
import RoomAssignmentPage from './pages/college-admin/room-assignment';
import RoundManagementPage from './pages/college-admin/round-management';
import AnalyticsPage from './pages/college-admin/analytics';
import SettingsPage from './pages/college-admin/settings';

// Public pages
import PublicApplyPage from './pages/public/apply';
import QRDisplayPage from './pages/public/qr-display';
import VerifyPage from './pages/public/verify';
import WelcomePage from './pages/public/welcome';
import NotFoundPage from './pages/not-found';

const ErrorBoundary = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
      <p className="text-slate-500 mb-4">An unexpected error occurred.</p>
      <button onClick={() => window.location.reload()}
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-500">
        Refresh Page
      </button>
    </div>
  </div>
);

export const router = createBrowserRouter([
  // Public pages (no auth)
  { path: '/apply/:formToken', element: <PublicApplyPage />, errorElement: <ErrorBoundary /> },
  { path: '/event/:driveId/qr-display', element: <QRDisplayPage />, errorElement: <ErrorBoundary /> },
  { path: '/event/:driveId/verify', element: <VerifyPage />, errorElement: <ErrorBoundary /> },
  { path: '/event/:driveId/welcome/:appId', element: <WelcomePage />, errorElement: <ErrorBoundary /> },
  { path: '/login', element: <LoginPage />, errorElement: <ErrorBoundary /> },

  // All admin pages (single authenticated layout)
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [{
      path: '',
      element: <AdminLayout />,
      children: [
        { path: 'dashboard', element: <AdminDashboardPage /> },
        { path: 'drives/new', element: <NewDriveWizard /> },
        { path: 'drives/:driveId', element: <DriveDetailPage /> },
        { path: 'drives/:driveId/room-assignment', element: <RoomAssignmentPage /> },
        { path: 'drives/:driveId/rounds', element: <RoundManagementPage /> },
        { path: 'drives', element: <DrivesListPage /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ]
    }]
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  // 404
  { path: '*', element: <NotFoundPage /> },
]);
