import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Gamepad2, Users, ListTodo, CheckSquare, Skull, MessageSquare, Activity, Settings, LogOut, Zap, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import NotificationToast from '../../components/NotificationToast';
import styles from './AdminLayout.module.css';

const NAV = [
  { to: '/admin',             label: 'Overview',     icon: LayoutDashboard, exact: true },
  { to: '/admin/game',        label: 'Game Control', icon: Gamepad2 },
  { to: '/admin/teams',       label: 'Teams',        icon: Users },
  { to: '/admin/tasks',       label: 'Tasks',        icon: ListTodo },
  { to: '/admin/submissions', label: 'Submissions',  icon: CheckSquare },
  { to: '/admin/kills',       label: 'Kills',        icon: Skull },
  { to: '/admin/meetings',    label: 'Meetings',     icon: MessageSquare },
  { to: '/admin/activity',    label: 'Activity',     icon: Activity },
  { to: '/admin/settings',    label: 'Settings',     icon: Settings },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const { gameState, notifications } = useGame();
  const phase = gameState?.gamePhase || gameState?.phase || 'LOBBY';

  const phaseColor = {
    LOBBY: '#8B949E', ASSIGNMENT: '#8B5CF6', TASKS: '#22C55E',
    DISCUSSION: '#F59E0B', VOTING: '#3B82F6', RESULTS: '#06B6D4',
    VICTORY: '#F59E0B', PAUSED: '#8B949E', FINISHED: '#8B949E'
  }[phase] || '#8B949E';

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}><Zap size={20} color="#EF4444" /></div>
          <div>
            <div className={styles.logoTitle}>TASKFORCE</div>
            <div className={styles.logoSub}>TRAITORS · ADMIN</div>
          </div>
        </div>

        {/* Phase indicator */}
        <div className={styles.phaseIndicator}>
          <span className="glow-dot" style={{ background: phaseColor, boxShadow: `0 0 8px ${phaseColor}` }} />
          <span style={{ color: phaseColor, fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.08em' }}>{phase}</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <ChevronRight size={14} className={styles.navChevron} />
              </NavLink>
            );
          })}
        </nav>

        <button className={styles.logoutBtn} onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>

      <NotificationToast notifications={notifications} />
    </div>
  );
}
