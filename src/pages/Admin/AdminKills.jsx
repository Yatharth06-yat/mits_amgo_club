import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { admin } from '../../services/api';
import { socket } from '../../socket/socketClient';

const STATUS_COLOR = { PENDING: 'var(--warning-primary)', ACKNOWLEDGED: 'var(--info-primary)', APPROVED: 'var(--crew-primary)', REJECTED: 'var(--text-muted)', ADMIN_OVERRIDE: 'var(--accent-purple)' };

export default function AdminKills() {
  const [kills, setKills] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { try { const d = await admin.getKills(); setKills(Array.isArray(d) ? d : d.kills || []); } catch(e){} finally { setLoading(false); } };
  useEffect(() => {
    load();
    socket.on('kill:reported', load);
    socket.on('kill:acknowledged', load);
    return () => { socket.off('kill:reported', load); socket.off('kill:acknowledged', load); };
  }, []);

  const approve = async (id) => { await admin.approveKill(id); load(); };
  const reject = async (id) => { const r = prompt('Rejection reason (optional):') || ''; await admin.rejectKill(id, r); load(); };
  const override = async (id) => { if(confirm('Force approve this kill (bypass acknowledgment)?')) { await admin.overrideKill(id); load(); } };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem' }}>Kill Reports ({kills.length})</h1>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      {loading ? <div className="flex justify-center" style={{ padding: 40 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div> : (
        kills.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No kill reports yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kills.map(kill => (
              <div key={kill.id} className="card" style={{ borderColor: STATUS_COLOR[kill.status] + '40' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--imposter-primary)', marginBottom: 4 }}>
                      Imposter: {kill.imposter?.team_name} ({kill.imposter?.team_code})
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      ⚔️ Target: {kill.victim?.team_name} ({kill.victim?.team_code})
                    </div>
                    {kill.reason && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reason: {kill.reason}</p>}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 4 }}>{new Date(kill.created_at || Date.now()).toLocaleTimeString()}</p>
                  </div>
                  <span className="badge" style={{ color: STATUS_COLOR[kill.status], background: `${STATUS_COLOR[kill.status]}15`, border: `1px solid ${STATUS_COLOR[kill.status]}40` }}>{kill.status}</span>
                </div>
                {['PENDING','ACKNOWLEDGED'].includes(kill.status) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-danger" onClick={() => approve(kill.id)}><CheckCircle size={14} /> Approve Kill</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => reject(kill.id)}><XCircle size={14} /> Reject</button>
                    <button className="btn btn-sm btn-warning" onClick={() => override(kill.id)}><AlertTriangle size={14} /> Force</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
