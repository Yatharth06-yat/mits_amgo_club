import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Image, Clock, RefreshCw } from 'lucide-react';
import { admin } from '../../services/api';
import { socket } from '../../socket/socketClient';

export default function AdminSubmissions() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState({});
  const [expanded, setExpanded] = useState(null);

  const load = async () => { try { const d = await admin.getVerifyQueue(); setQueue(Array.isArray(d) ? d : d.queue || []); } catch(e){} finally { setLoading(false); } };

  useEffect(() => {
    load();
    socket.on('task:submitted', () => load());
    return () => socket.off('task:submitted');
  }, []);

  const verify = async (id, action) => {
    await admin.verify(id, action, rejectNote[id]);
    setQueue(q => q.filter(s => s.id !== id));
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem' }}>Verification Queue ({queue.length})</h1>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      {loading ? <div className="flex justify-center" style={{ padding: 40 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div> : (
        queue.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--crew-primary)' }} />
            <p style={{ fontWeight: 600 }}>Queue is empty — all submissions verified!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {queue.map(sub => (
              <div key={sub.id} className="card" style={{ borderColor: sub.proof_url ? 'rgba(59,130,246,0.3)' : 'var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{sub.teams?.team_name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {sub.teams?.team_code}</span></div>
                    <div style={{ fontWeight: 600, color: 'var(--info-primary)', marginBottom: 4 }}>{sub.tasks?.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {new Date(sub.submitted_at).toLocaleTimeString()} · {sub.tasks?.points}pts
                    </div>
                  </div>
                  <span className="badge badge-warning">{sub.tasks?.task_type}</span>
                </div>

                {sub.answer && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 12 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>ANSWER</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{sub.answer}</p>
                  </div>
                )}

                {(sub.proof_url || sub.proof_metadata?.signedUrl) && (
                  <div style={{ marginBottom: 12 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}>
                      <Image size={14} /> {expanded === sub.id ? 'Hide' : 'View'} Proof
                    </button>
                    {expanded === sub.id && (
                      <img src={sub.proof_url || sub.proof_metadata?.signedUrl} alt="Proof" style={{ display: 'block', maxWidth: '100%', maxHeight: 400, objectFit: 'contain', marginTop: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-sm btn-crew" onClick={() => verify(sub.id, 'approve')}><CheckCircle size={14} /> Approve</button>
                  <input className="input" style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }} placeholder="Rejection reason..." value={rejectNote[sub.id] || ''} onChange={e => setRejectNote(n => ({...n, [sub.id]: e.target.value}))} />
                  <button className="btn btn-sm btn-danger" onClick={() => verify(sub.id, 'reject')}><XCircle size={14} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
