import { useState, useEffect } from 'react';
import { Bell, Vote } from 'lucide-react';
import { volunteer as volApi } from '../../services/api';
import { useGame } from '../../context/GameContext';
import { socket } from '../../socket/socketClient';

export default function VolunteerMeeting() {
  const [meeting, setMeeting] = useState(null);
  const [aliveTeams, setAliveTeams] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const d = await volApi.getActiveMeeting();
      setMeeting(d);
      setAliveTeams(d?.aliveTeams || []);
      setHasVoted(d?.hasVoted || false);
    } catch(e) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    socket.on('meeting:called', load);
    socket.on('meeting:voting_open', load);
    socket.on('meeting:result', () => { setMeeting(null); load(); });
    socket.on('meeting:closed', () => setMeeting(null));
    return () => { socket.off('meeting:called', load); socket.off('meeting:voting_open', load); socket.off('meeting:result'); socket.off('meeting:closed'); };
  }, []);

  const callMeeting = async () => {
    setError('');
    try { await volApi.callMeeting(reason); setReason(''); load(); }
    catch(e) { setError(e.message); }
  };

  const castVote = async (targetId) => {
    setError('');
    try { await volApi.castVote({ targetTeamId: targetId }); setHasVoted(true); }
    catch(e) { setError(e.message); }
  };

  if (loading) return <div className="flex justify-center" style={{ padding: 60 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: '1rem' }}>Emergency Meeting</h2>

      {error && <div className="card" style={{ marginBottom: 12, borderColor: 'var(--border-imposter)', color: 'var(--imposter-primary)', fontSize: '0.85rem' }}>{error}</div>}

      {!meeting ? (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>No active meeting. Call one if you witnessed a kill or suspicious activity.</p>
          <input className="input" style={{ marginBottom: 10 }} placeholder="Reason for meeting..." value={reason} onChange={e => setReason(e.target.value)} />
          <button className="btn btn-warning btn-block" onClick={callMeeting}><Bell size={16} /> Call Emergency Meeting</button>
        </div>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--warning-primary)' }}>🔔 MEETING IN PROGRESS</span>
              <span className="badge badge-warning">{meeting.phase}</span>
            </div>
            {meeting.voting_ends_at && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Voting ends: {new Date(meeting.voting_ends_at).toLocaleTimeString()}</p>}
          </div>

          {meeting.phase === 'DISCUSSION' && (
            <div className="card">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>💬 Discussion phase. Present your case and listen to others.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>Voting will open when the admin is ready.</p>
            </div>
          )}

          {meeting.phase === 'VOTING' && !hasVoted && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', color: 'var(--info-primary)' }}>🗳️ Cast Your Vote</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Vote for who you think is an imposter, or skip.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aliveTeams.map(t => (
                  <button key={t.id} className="btn btn-ghost btn-block" onClick={() => castVote(t.id)} style={{ justifyContent: 'flex-start' }}>
                    <Vote size={16} /> {t.team_name} <span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: '0.8rem' }}>{t.team_code}</span>
                  </button>
                ))}
                <button className="btn btn-ghost btn-block" onClick={() => castVote('skip')} style={{ color: 'var(--text-muted)', borderStyle: 'dashed' }}>⏭️ Skip Vote</button>
              </div>
            </div>
          )}

          {meeting.phase === 'VOTING' && hasVoted && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--crew-primary)' }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>✅ Vote Cast!</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Waiting for all votes to be tallied...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
