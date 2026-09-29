import { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Shuffle, ChevronRight, Trophy, AlertTriangle } from 'lucide-react';
import { admin } from '../../services/api';

const PHASES = ['LOBBY','ASSIGNMENT','TASKS','DISCUSSION','VOTING','RESULTS','VICTORY'];

export default function AdminGame() {
  const [loading, setLoading] = useState('');
  const [phase, setPhase] = useState('');
  const [log, setLog] = useState([]);
  const [winner, setWinner] = useState('CREW');
  const [teams, setTeams] = useState([]);
  const [assignMsg, setAssignMsg] = useState(null);

  const loadTeams = async () => {
    try {
      const d = await admin.getTeams();
      setTeams(Array.isArray(d) ? d : []);
    } catch(e) {}
  };

  useEffect(() => { loadTeams(); }, []);

  const act = async (label, fn) => {
    setLoading(label);
    try { await fn(); addLog(`✅ ${label} success`); }
    catch(e) { addLog(`❌ ${label}: ${e.message}`); }
    finally { setLoading(''); }
  };
  const addLog = msg => setLog(l => [{ msg, t: new Date().toLocaleTimeString() }, ...l].slice(0, 20));

  const teamsRegistered = teams.length;
  const imposterCount = teams.filter(t => (t.role || '').toUpperCase() === 'IMPOSTER').length;
  const crewCount = teams.filter(t => (t.role || '').toUpperCase() === 'CREW').length;
  const isAssigned = imposterCount > 0;
  const canAssign = teamsRegistered === 20 && !isAssigned;

  const assignRandomRoles = async () => {
    setLoading('assign');
    setAssignMsg(null);
    try {
      const res = await admin.assignRoles();
      const text = res.message || 'Roles assigned successfully: 15 Crew / 5 Imposters';
      setAssignMsg({ type: 'success', text });
      addLog(`✅ ${text}`);
      await loadTeams();
    } catch (err) {
      console.error('Role assignment error:', err);
      const errText = err.message || 'Failed to assign roles';
      setAssignMsg({ type: 'error', text: errText });
      addLog(`❌ Role assignment error: ${errText}`);
    } finally {
      setLoading('');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '2rem' }}>Game Control</h1>
      <div className="grid-2" style={{ gap: '1.5rem' }}>

        {/* Phase Control */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>GAME CONTROL</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-crew btn-block" onClick={() => act('Start Game', admin.startGame)} disabled={!!loading}>
              <Play size={16} /> Start Game
            </button>
            <button className="btn btn-warning btn-block" onClick={() => act('Pause', admin.pauseGame)} disabled={!!loading}>
              <Pause size={16} /> Pause Game
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => { if(confirm('Reset ALL game data?')) act('Reset', admin.resetGame); }} disabled={!!loading}>
              <RefreshCw size={16} /> Reset Game
            </button>
          </div>
        </div>

        {/* Role Assignment */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>ROLE ASSIGNMENT</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Teams Registered</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{teamsRegistered} / 20</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--crew-primary)', fontWeight: 600 }}>Crew</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--crew-primary)' }}>{isAssigned ? crewCount : 15}</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--imposter-primary)', fontWeight: 600 }}>Imposters</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--imposter-primary)' }}>{isAssigned ? imposterCount : 5}</div>
            </div>
          </div>

          {assignMsg && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: assignMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: assignMsg.type === 'success' ? 'var(--crew-primary)' : 'var(--imposter-primary)', border: `1px solid ${assignMsg.type === 'success' ? 'var(--crew-primary)' : 'var(--imposter-primary)'}40`, fontSize: '0.8rem' }}>
              {assignMsg.text}
            </div>
          )}

          <button
            className="btn btn-danger btn-block"
            onClick={assignRandomRoles}
            disabled={!canAssign || !!loading}
          >
            <Shuffle size={16} /> Assign 5 Random Imposters
          </button>

          {teamsRegistered !== 20 && !isAssigned && (
            <p style={{ fontSize: '0.72rem', color: 'var(--warning-primary)', marginTop: 8, textAlign: 'center' }}>
              Requires exactly 20 teams registered to assign roles (currently {teamsRegistered}).
            </p>
          )}
          {isAssigned && (
            <p style={{ fontSize: '0.72rem', color: 'var(--crew-primary)', marginTop: 8, textAlign: 'center' }}>
              ✅ Roles assigned and locked in Supabase.
            </p>
          )}
        </div>

        {/* Phase Jump */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>JUMP TO PHASE</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {PHASES.map(p => (
              <button key={p} className={`btn btn-sm ${phase === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPhase(p)}>{p}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-block" onClick={() => act(`Set Phase: ${phase}`, () => admin.setPhase(phase, true))} disabled={!phase || !!loading}>
            <ChevronRight size={16} /> Force Phase Change
          </button>
        </div>

        {/* End Game */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>END GAME</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['CREW','IMPOSTERS'].map(w => (
              <button key={w} className={`btn btn-sm flex-1 ${winner === w ? (w==='CREW' ? 'btn-crew' : 'btn-danger') : 'btn-ghost'}`} onClick={() => setWinner(w)}>{w} WINS</button>
            ))}
          </div>
          <button className="btn btn-warning btn-block" onClick={() => { if(confirm(`End game with ${winner} as winner?`)) act('End Game', () => admin.endGame(winner)); }} disabled={!!loading}>
            <Trophy size={16} /> Declare Winner: {winner}
          </button>
        </div>

        {/* Action Log */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>ACTION LOG</h2>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {log.length === 0 && <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>No actions yet.</p>}
            {log.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-faint)', flexShrink: 0 }}>{l.t}</span>
                <span style={{ color: l.msg.startsWith('✅') ? 'var(--crew-primary)' : 'var(--imposter-primary)' }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
