import { NavLink, Outlet } from 'react-router-dom';
import { Home, ListTodo, MessageSquare, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import NotificationToast from '../../components/NotificationToast';
import KillAlert from '../../components/KillAlert';
import MeetingModal from '../../components/MeetingModal';

const NAV = [
  { to: '/volunteer', label: 'Home', icon: Home, exact: true },
  { to: '/volunteer/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/volunteer/meeting', label: 'Meeting', icon: MessageSquare },
];

export default function VolunteerLayout() {
  const { logout } = useAuth();
  const { notifications, killAlert, activeMeeting } = useGame();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', padding: '0 1rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="var(--info-primary)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em' }}>TASKFORCE</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--info-primary)', letterSpacing: '0.05em', fontWeight: 600 }}>VOLUNTEER</div>
            </div>
          </div>
          <button onClick={logout} className="btn-icon"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '1rem' }}>
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex' }}>
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to} to={item.to} end={item.exact}
                style={({ isActive }) => ({
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '10px 0', textDecoration: 'none', fontSize: '0.65rem', fontWeight: 600,
                  color: isActive ? 'var(--info-primary)' : 'var(--text-muted)',
                  borderTop: `2px solid ${isActive ? 'var(--info-primary)' : 'transparent'}`,
                  transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.05em'
                })}
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <NotificationToast notifications={notifications} />
      {killAlert && <KillAlert data={killAlert} />}
      {activeMeeting && <MeetingModal meeting={activeMeeting} role="volunteer" />}
    </div>
  );
}
