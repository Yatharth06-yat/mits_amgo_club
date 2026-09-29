// MeetingModal is handled inline within GameContext notifications
// This is a placeholder that shows meeting status in a minimal bar
export default function MeetingModal({ meeting }) {
  if (!meeting) return null;
  return (
    <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 800, display: 'flex', justifyContent: 'center', padding: '0 1rem' }}>
      <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 'var(--radius-lg)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(8px)', animation: 'slideUp 0.3s ease' }}>
        <span style={{ fontSize: '1.2rem', animation: 'flash 1s infinite' }}>🔔</span>
        <span style={{ fontWeight: 700, color: 'var(--warning-primary)', fontSize: '0.9rem' }}>
          {meeting.phase === 'DISCUSSION' ? 'EMERGENCY MEETING — DISCUSSION' :
           meeting.phase === 'VOTING'     ? 'VOTING IN PROGRESS — Cast your vote' :
           'MEETING IN PROGRESS'}
        </span>
      </div>
    </div>
  );
}
