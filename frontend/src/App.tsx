import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Building2, Users, Activity, Loader2 } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';

const GOOGLE_CLIENT_ID = '808319308214-sjot8gd2vgb77t732o09pll9kvvnt2ci.apps.googleusercontent.com';

import StudentHub from './pages/StudentHub/StudentHub';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import DriveWizard from './pages/AdminDashboard/DriveWizard/DriveWizard';
import DriveDetail from './pages/AdminDashboard/DriveDetail/DriveDetail';
import DrivesList from './pages/AdminDashboard/DrivesList';
import AdminLogin from './pages/Auth/AdminLogin';
import StudentRegistration from './pages/Public/StudentRegistration';
import StudentsPanel from './pages/AdminDashboard/StudentsPanel';
import CalendarPanel from './pages/AdminDashboard/CalendarPanel';
import SettingsPanel from './pages/AdminDashboard/SettingsPanel';

import AdminOverview from './pages/AdminDashboard/AdminOverview';
function App() {
  const { t } = useTranslation();
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div className="min-h-screen bg-background text-foreground font-sans">
          <Routes>
            {/* Public / Student Routes */}
            <Route path="/" element={<StudentHub />} />
            <Route path="/register/:driveId" element={<StudentRegistration />} />
            
            {/* Admin Authentication */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Admin Routes with Dashboard Layout Wrapper */}
            <Route path="/admin" element={<AdminDashboard />}>
              <Route index element={<AdminOverview />} />
              <Route path="drives" element={<DrivesList />} />
              <Route path="drives/new" element={<DriveWizard />} />
              <Route path="drives/:id" element={<DriveDetail />} />
              <Route path="students" element={<StudentsPanel />} />
              <Route path="calendar" element={<CalendarPanel />} />
              <Route path="settings" element={<SettingsPanel />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
