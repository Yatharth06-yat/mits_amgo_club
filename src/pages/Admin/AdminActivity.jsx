import { useState, useEffect } from 'react';
import { admin } from '../../services/api';

export default function AdminActivity() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { admin.getActivity().then(d => setActivity(d.activity || [])).catch(console.error).finally(() => setLoading(false)); }, []);

  const filtered = activity.filter(a => !filter || a.event_type?.includes(filter.toUpperCase()) || a.message?.toLowerCase().includes(filter.toLowerCase()));

  const typeColor = t => ({
    GAME_STARTED:'var(--crew-primary)', GAME_OVER:'var(--imposter-primary)', TEAM_ELIMINATED:'var(--imposter-primary)',
    TASK_COMPLETED:'var(--crew-primary)', MEETING_STARTED:'var(--warning-primary)', VOTE_TIED:'var(--info-primary)',
    TEAM_EJECTED:'var(--accent-purple)', KILL_REPORTED:'var(--warning-primary)', ROLES_ASSIGNED:'var(--accent-purple)'
  })[t] || 'var(--text-muted)';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '1.5rem' }}>Activity Log</h1>
      <div style={{ marginBottom: 16 }}>
        <input className="input" placeholder="Filter by event or message..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      {loading ? <div className="flex justify-center" style={{ padding: 40 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 16, padding: '10px 14px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-faint)', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{new Date(a.created_at).toLocaleTimeString()}</span>
              <span style={{ color: typeColor(a.event_type), fontWeight: 600, minWidth: 120, flexShrink: 0 }}>{a.event_type}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{a.message}</span>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No activity found.</p>}
        </div>
      )}
    </div>
  );
}
