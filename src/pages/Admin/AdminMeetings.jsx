import { useState, useEffect } from 'react';
import { Bell, Vote, BarChart2, X } from 'lucide-react';
import { admin } from '../../services/api';
import { socket } from '../../socket/socketClient';

export default function AdminMeetings() {
  const [active, setActive] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [a, m] = await Promise.all([admin.getActiveMeeting(), admin.getMeetings()]);
      setActive(a);
      setMeetings(Array.isArray(m) ? m : m.meetings || []);
    } catch(e){}
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    socket.on('meeting:called', load);
    socket.on('vote:tally', load);
    socket.on('meeting:closed', load);
    return () => { socket.off('meeting:called', load); socket.off('vote:tally', load); socket.off('meeting:closed', load); };
  }, []);

  const startMeeting = async () => { await admin.startMeeting(reason); setReason(''); load(); };
  const openVoting = async () => { await admin.openVoting(active.id); load(); };
  const reveal = async () => { await admin.revealResult(active.id); load(); };
  const close = async () => { await admin.closeMeeting(active.id); load(); };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '1.5rem' }}>Meeting Control</h1>

      {/* Call meeting */}
      {!active && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Call Emergency Meeting</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Reason (optional)..." value={reason} onChange={e => setReason(e.target.value)} />
            <button className="btn btn-warning" onClick={startMeeting}><Bell size={16} /> Call Meeting</button>
          </div>
        </div>
      )}

      {/* Active meeting */}
      {active && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(245,158,11,0.4)', boxShadow: '0 0 24px rgba(245,158,11,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--warning-primary)' }}>🔔 Active Meeting</h3>
            <span className="badge badge-warning">{active.phase}</span>
          </div>

          {active.voteCount !== undefined && (
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>Votes cast: <strong>{active.voteCount}</strong></p>
          )}

          {active.tally?.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {active.tally.map(row => (
                <div key={row.target_team_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: 600 }}>{row.target_name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--info-primary)' }}>{row.vote_count} votes</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {active.phase === 'DISCUSSION' && <button className="btn btn-primary" onClick={openVoting}><Vote size={16} /> Open Voting</button>}
            {active.phase === 'VOTING'    && <button className="btn btn-warning" onClick={reveal}><BarChart2 size={16} /> Reveal Result</button>}
            <button className="btn btn-ghost" onClick={close}><X size={16} /> Close Meeting</button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Meeting History</h3>
        {meetings.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No meetings yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meetings.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>{new Date(m.started_at || m.created_at).toLocaleTimeString()}</span>
                  {m.triggered_team?.team_name && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>by {m.triggered_team.team_name}</span>}
                  {m.eliminated_team_id && <span style={{ color: m.eliminated_team?.role === 'IMPOSTER' ? 'var(--imposter-primary)' : 'var(--crew-primary)', fontSize: '0.85rem', marginLeft: 8 }}>→ Ejected: {m.eliminated_team?.team_name || 'Team'}</span>}
                </div>
                <span className={`badge ${m.phase === 'CLOSED' ? 'badge-muted' : 'badge-warning'}`}>{m.phase}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
