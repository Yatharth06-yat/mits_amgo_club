import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ICONS = { success: CheckCircle, warning: AlertTriangle, info: Info, danger: XCircle, victory: CheckCircle };
const COLORS = { success: 'var(--crew-primary)', warning: 'var(--warning-primary)', info: 'var(--info-primary)', danger: 'var(--imposter-primary)', victory: 'var(--warning-primary)' };

export default function NotificationToast({ notifications = [] }) {
  if (!notifications.length) return null;
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
      {notifications.map(n => {
        const Icon = ICONS[n.type] || Info;
        const color = COLORS[n.type] || 'var(--info-primary)';
        return (
          <div key={n.id} style={{ background: 'var(--bg-panel)', border: `1px solid ${color}40`, borderRadius: 'var(--radius-lg)', padding: '12px 16px', boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.3s ease both', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {n.title && <div style={{ fontWeight: 700, fontSize: '0.85rem', color, marginBottom: 2 }}>{n.title}</div>}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
