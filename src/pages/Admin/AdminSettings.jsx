import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { admin } from '../../services/api';

const FIELDS = [
  { key: 'crew_task_win_pct', label: 'Crew Task Win %', type: 'number', min: 1, max: 100 },
  { key: 'discussion_secs',    label: 'Discussion Time (sec)', type: 'number', min: 30 },
  { key: 'voting_secs',        label: 'Voting Time (sec)', type: 'number', min: 30 },
  { key: 'kill_ack_secs',      label: 'Kill Ack Window (sec)', type: 'number', min: 10 },
  { key: 'max_meetings_per_team', label: 'Max Meetings Per Team', type: 'number', min: 1 },
  { key: 'total_imposter_teams',  label: 'Total Imposter Teams', type: 'number', min: 1 },
  { key: 'total_crew_teams',      label: 'Total Crew Teams', type: 'number', min: 1 },
  { key: 'tasks_per_team_min',    label: 'Tasks Per Team (Min)', type: 'number', min: 1 },
  { key: 'tasks_per_team_max',    label: 'Tasks Per Team (Max)', type: 'number', min: 1 },
  { key: 'tie_vote_action',       label: 'Tie Vote Action', type: 'select', options: ['skip','random'] },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => { admin.getSettings().then(d => setSettings(d.settings || {})).finally(() => setLoading(false)); }, []);

  const save = async () => {
    await admin.updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center" style={{ padding: 40 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 600 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '1.5rem' }}>Game Settings</h1>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
              {f.type === 'select' ? (
                <select className="select" value={settings[f.key] || ''} onChange={e => setSettings(s => ({...s, [f.key]: e.target.value}))}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input" type={f.type} min={f.min} max={f.max} value={settings[f.key] ?? ''} onChange={e => setSettings(s => ({...s, [f.key]: f.type === 'number' ? +e.target.value : e.target.value}))} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-crew" onClick={save}>
            <Save size={16} /> {saved ? '✅ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
