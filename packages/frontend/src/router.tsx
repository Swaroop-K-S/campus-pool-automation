import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/login';
import { ProtectedRoute } from './components/shared/protected-route';

// Layouts
import AdminLayout from './components/shared/AdminLayout';
import PlatformLayout from './components/shared/PlatformLayout';
import HRLayout from './components/shared/HRLayout';
import InvigilatorLayout from './components/shared/InvigilatorLayout';

// College Admin pages
import AdminDashboardPage from './pages/college-admin/dashboard';
import DrivesListPage from './pages/college-admin/drives-list';
import NewDriveWizard from './pages/college-admin/new-drive';
import DriveDetailPage from './pages/college-admin/drive-detail';
import RoomAssignmentPage from './pages/college-admin/room-assignment';
import RoundManagementPage from './pages/college-admin/round-management';
import AnalyticsPage from './pages/college-admin/analytics';

// Platform Admin pages
import PlatformDashboardPage from './pages/platform-admin/dashboard';
import CollegesPage from './pages/platform-admin/colleges';
import CollegeDetailPage from './pages/platform-admin/college-detail';

// Company HR pages
import HRDashboard from './pages/company-hr/dashboard';
import HRStudents from './pages/company-hr/students';
import HRUploadResults from './pages/company-hr/upload-results';
import HRGDAssignments from './pages/company-hr/gd-assignments';

// Invigilator pages
import InvigilatorDashboard from './pages/invigilator/dashboard';
import InvigilatorSchedule from './pages/invigilator/schedule';

// Public pages
import PublicApplyPage from './pages/public/apply';
import QRDisplayPage from './pages/public/qr-display';
import VerifyPage from './pages/public/verify';
import WelcomePage from './pages/public/welcome';

// Misc
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

const GenericDashboard = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-slate-500 mt-2">Coming soon.</p>
  </div>
);

export const router = createBrowserRouter([
  // Public pages (no auth)
  { path: '/apply/:formToken', element: <PublicApplyPage />, errorElement: <ErrorBoundary /> },
  { path: '/event/:driveId/qr-display', element: <QRDisplayPage />, errorElement: <ErrorBoundary /> },
  { path: '/event/:driveId/verify', element: <VerifyPage />, errorElement: <ErrorBoundary /> },
  { path: '/event/:driveId/welcome/:appId', element: <WelcomePage />, errorElement: <ErrorBoundary /> },
  { path: '/login', element: <LoginPage />, errorElement: <ErrorBoundary /> },

  // Platform Admin
  {
    path: '/platform',
    element: <ProtectedRoute allowedRoles={['platform_admin']} />,
    children: [{
      path: '',
      element: <PlatformLayout />,
      children: [
        { path: 'dashboard', element: <PlatformDashboardPage /> },
        { path: 'colleges', element: <CollegesPage /> },
        { path: 'colleges/:id', element: <CollegeDetailPage /> },
        { path: 'settings', element: <GenericDashboard title="Platform Settings" /> }
      ]
    }]
  },

  // College Admin
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['college_admin']} />,
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
        { path: 'users', element: <GenericDashboard title="Users Management" /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'settings', element: <GenericDashboard title="Settings" /> },
      ]
    }]
  },

  // Company HR
  {
    path: '/hr',
    element: <ProtectedRoute allowedRoles={['company_hr']} />,
    children: [{
      path: '',
      element: <HRLayout />,
      children: [
        { path: 'dashboard', element: <HRDashboard /> },
        { path: 'students', element: <HRStudents /> },
        { path: 'upload-results', element: <HRUploadResults /> },
        { path: 'gd-assignments', element: <HRGDAssignments /> },
      ]
    }]
  },

  // Invigilator
  {
    path: '/invigilator',
    element: <ProtectedRoute allowedRoles={['invigilator']} />,
    children: [{
      path: '',
      element: <InvigilatorLayout />,
      children: [
        { path: 'dashboard', element: <InvigilatorDashboard /> },
        { path: 'schedule', element: <InvigilatorSchedule /> },
      ]
    }]
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  // 404
  { path: '*', element: <NotFoundPage /> },
]);
