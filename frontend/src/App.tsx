import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import StudentHub from './pages/StudentHub/StudentHub';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import DriveWizard from './pages/AdminDashboard/DriveWizard/DriveWizard';
import DriveDetail from './pages/AdminDashboard/DriveDetail/DriveDetail';
import AdminLogin from './pages/Auth/AdminLogin';

// Placeholder for the overview page inside the dashboard
function AdminOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-card text-card-foreground p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-primary hover:shadow-lg transition-shadow transition-transform hover:-translate-y-1">
        <h2 className="text-muted-foreground font-medium mb-1">Active Drives</h2>
        <p className="text-4xl font-bold">1</p>
      </div>
      <div className="bg-card text-card-foreground p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-primary hover:shadow-lg transition-shadow transition-transform hover:-translate-y-1">
        <h2 className="text-muted-foreground font-medium mb-1">Total Students</h2>
        <p className="text-4xl font-bold">450</p>
      </div>
      <div className="bg-card text-card-foreground p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-primary hover:shadow-lg transition-shadow transition-transform hover:-translate-y-1">
        <h2 className="text-muted-foreground font-medium mb-1">System Status</h2>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
          <p className="text-xl font-semibold">Online</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Routes>
          {/* Public / Student Routes */}
          <Route path="/" element={<StudentHub />} />
          
          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Admin Routes with Dashboard Layout Wrapper */}
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<AdminOverview />} />
            <Route path="drives" element={
              <div>
                 <div className="flex justify-end mb-6">
                   <Link to="/admin/drives/new" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg shadow-sm hover:bg-primary/90 font-bold transition-colors shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">
                     + Create New Drive
                   </Link>
                 </div>
                 {/* Drive list goes here */}
              </div>
            } />
            <Route path="drives/new" element={<DriveWizard />} />
            <Route path="drives/:id" element={<DriveDetail />} />
            <Route path="students" element={<div>Students Panel (Coming Soon)</div>} />
            <Route path="calendar" element={<div>Calendar Sync (Coming Soon)</div>} />
            <Route path="settings" element={<div>System Settings (Coming Soon)</div>} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
