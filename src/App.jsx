import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import './styles/design-system.css';

// Pages
import LoginPage       from './pages/Login/LoginPage';
import AdminLayout     from './pages/Admin/AdminLayout';
import AdminOverview   from './pages/Admin/AdminOverview';
import AdminCCTV       from './pages/Admin/AdminCCTV';
import AdminGame       from './pages/Admin/AdminGame';
import AdminTeams      from './pages/Admin/AdminTeams';
import AdminTasks      from './pages/Admin/AdminTasks';
import AdminSubmissions from './pages/Admin/AdminSubmissions';
import AdminKills      from './pages/Admin/AdminKills';
import AdminMeetings   from './pages/Admin/AdminMeetings';
import AdminActivity   from './pages/Admin/AdminActivity';
import AdminSettings   from './pages/Admin/AdminSettings';
import VolunteerLayout from './pages/Volunteer/VolunteerLayout';
import VolunteerHome   from './pages/Volunteer/VolunteerHome';
import VolunteerTasks  from './pages/Volunteer/VolunteerTasks';
import VolunteerMeeting from './pages/Volunteer/VolunteerMeeting';
import TeamLayout      from './pages/Team/TeamLayout';
import TeamDashboard   from './pages/Team/TeamDashboard';
import TeamTasks       from './pages/Team/TeamTasks';
import TeamMeeting     from './pages/Team/TeamMeeting';
import ProjectorPage   from './pages/Projector/ProjectorPage';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
    <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border-strong)', borderTopColor: 'var(--info-primary)', borderRadius: '50%' }} />
  </div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/projector" element={<ProjectorPage />} />

      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminOverview />} />
        <Route path="cctv"        element={<AdminCCTV />} />
        <Route path="game"        element={<AdminGame />} />
        <Route path="teams"       element={<AdminTeams />} />
        <Route path="tasks"       element={<AdminTasks />} />
        <Route path="submissions" element={<AdminSubmissions />} />
        <Route path="kills"       element={<AdminKills />} />
        <Route path="meetings"    element={<AdminMeetings />} />
        <Route path="activity"    element={<AdminActivity />} />
        <Route path="settings"    element={<AdminSettings />} />
      </Route>

      <Route path="/volunteer" element={<ProtectedRoute requiredRole="volunteer"><VolunteerLayout /></ProtectedRoute>}>
        <Route index element={<VolunteerHome />} />
        <Route path="tasks"   element={<VolunteerTasks />} />
        <Route path="meeting" element={<VolunteerMeeting />} />
      </Route>

      <Route path="/team" element={<ProtectedRoute requiredRole="team"><TeamLayout /></ProtectedRoute>}>
        <Route index element={<TeamDashboard />} />
        <Route path="tasks"   element={<TeamTasks />} />
        <Route path="meeting" element={<TeamMeeting />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <AppRoutes />
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
