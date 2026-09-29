import { useState, useEffect } from 'react';
import { Plus, Trash2, KeyRound, RefreshCw, Users, Search } from 'lucide-react';
import { admin } from '../../services/api';

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTeam, setNewTeam] = useState({ teamName: '', teamNumber: '', players: ['','',''], volunteerName: '' });
  const [pinResult, setPinResult] = useState(null);

  const load = async () => {
    try {
      const d = await admin.getTeams();
      setTeams(Array.isArray(d) ? d : d?.teams || []);
    } catch (err) {
      console.error("Supabase error in AdminTeams load:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);
      console.error("Error details:", err?.details);
      console.error("Error hint:", err?.hint);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = teams.filter(t => t.team_name?.toLowerCase().includes(search.toLowerCase()) || t.team_code?.toLowerCase().includes(search.toLowerCase()));

  const deleteTeam = async (id, name) => {
    if (!confirm(`Delete team "${name}"?`)) return;
    await admin.deleteTeam(id);
    setTeams(t => t.filter(x => x.id !== id));
  };

  const resetPin = async (id) => {
    const d = await admin.resetPin(id);
    setPinResult({ id, pin: d.pin });
  };

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const d = await admin.createTeam({ ...newTeam, players: newTeam.players.filter(Boolean) });
      setPinResult({ teamCode: d.teamCode, pin: d.pin, volunteerPin: d.volunteer?.pin });
      setShowCreate(false);
      setNewTeam({ teamName: '', teamNumber: '', players: ['','',''], volunteerName: '' });
      load();
    } catch (err) {
      console.error("Supabase error in AdminTeams createTeam:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);
      console.error("Error details:", err?.details);
      console.error("Error hint:", err?.hint);
      alert(err.message || 'Failed to create team');
    }
  };

  const roleColor = role => role === 'IMPOSTER' ? 'var(--imposter-primary)' : role === 'CREW' ? 'var(--crew-primary)' : 'var(--text-muted)';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem' }}>Teams ({teams.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}><Plus size={16} /> New Team</button>
      </div>

      {pinResult && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--crew-primary)' }}>
          <p style={{ color: 'var(--crew-primary)', fontWeight: 700, marginBottom: 8 }}>✅ Team Created / PIN Reset</p>
          {pinResult.teamCode && <p style={{ fontSize: '0.9rem' }}>Team Code: <strong>{pinResult.teamCode}</strong></p>}
          <p style={{ fontSize: '0.9rem' }}>Team PIN: <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--warning-primary)' }}>{pinResult.pin}</strong></p>
          {pinResult.volunteerPin && <p style={{ fontSize: '0.9rem' }}>Volunteer PIN: <strong style={{ fontFamily: 'monospace', color: 'var(--info-primary)' }}>{pinResult.volunteerPin}</strong></p>}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>⚠️ Save this PIN now — it cannot be recovered after closing.</p>
          <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => setPinResult(null)}>Dismiss</button>
        </div>
      )}

      {showCreate && (
        <form className="card" style={{ marginBottom: '1.5rem' }} onSubmit={createTeam}>
          <h3 style={{ marginBottom: '1rem' }}>Create New Team</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Team Name</label>
              <input className="input" required value={newTeam.teamName} onChange={e => setNewTeam(p => ({...p, teamName: e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Team Number</label>
              <input className="input" type="number" required value={newTeam.teamNumber} onChange={e => setNewTeam(p => ({...p, teamNumber: e.target.value}))} />
            </div>
            {[0,1,2].map(i => (
              <div key={i}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Player {i+1}</label>
                <input className="input" value={newTeam.players[i]} onChange={e => setNewTeam(p => { const pl=[...p.players]; pl[i]=e.target.value; return {...p, players: pl}; })} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Volunteer Name</label>
              <input className="input" value={newTeam.volunteerName} onChange={e => setNewTeam(p => ({...p, volunteerName: e.target.value}))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-crew">Create Team</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search teams..." style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="flex justify-center" style={{ padding: 40 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(team => (
            <div key={team.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ minWidth: 52, fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{team.team_code}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{team.team_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {team.players?.map(p => p.display_name).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {team.role && <span className="badge" style={{ background: team.role === 'IMPOSTER' ? 'var(--imposter-glow)' : 'var(--crew-glow)', color: roleColor(team.role), border: `1px solid ${roleColor(team.role)}40` }}>{team.role}</span>}
                <span className={`badge ${team.alive ? 'badge-crew' : 'badge-muted'}`}>{team.alive ? 'ALIVE' : 'OUT'}</span>
                <span style={{ fontWeight: 700, color: 'var(--warning-primary)', fontFamily: 'var(--font-heading)' }}>{team.score || 0}pt</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-icon" title="Reset PIN" onClick={() => resetPin(team.id)}><KeyRound size={14} /></button>
                <button className="btn-icon" title="Delete" style={{ color: 'var(--imposter-primary)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => deleteTeam(team.id, team.team_name)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No teams found.</p>}
        </div>
      )}
    </div>
  );
}
