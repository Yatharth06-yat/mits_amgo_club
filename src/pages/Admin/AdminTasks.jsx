import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Zap } from 'lucide-react';
import { admin } from '../../services/api';

const TASK_TYPES = ['TRIVIA','MCQ','PUZZLE','PHOTO_UPLOAD','PHYSICAL_VERIFICATION','SPEED_CHALLENGE','CODE_CRACKER','SEQUENCE','CIPHER','PATTERN_MATCH','RIDDLE','TEAM_COORDINATION'];
const DIFFICULTIES = ['EASY','MEDIUM','HARD','EXTREME'];
const diffColor = { EASY: 'var(--crew-primary)', MEDIUM: 'var(--info-primary)', HARD: 'var(--warning-primary)', EXTREME: 'var(--imposter-primary)' };

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [autoLog, setAutoLog] = useState('');
  const [form, setForm] = useState({ title:'', description:'', task_type:'TRIVIA', difficulty:'MEDIUM', points: 20, time_limit: 120, configuration: { question:'', correctAnswer:'', hint:'' } });

  useEffect(() => { admin.getTasks().then(d => setTasks(Array.isArray(d) ? d : d.tasks || [])).catch(console.error).finally(() => setLoading(false)); }, []);

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateConfig = (k, v) => setForm(f => ({ ...f, configuration: { ...f.configuration, [k]: v } }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await admin.createTask(form);
      setTasks(t => [...t, d.task || d]);
      setShowForm(false);
      setForm({ title:'', description:'', task_type:'TRIVIA', difficulty:'MEDIUM', points: 20, time_limit: 120, configuration: { question:'', correctAnswer:'', hint:'' } });
    } catch(e) { alert(e.message); }
  };

  const del = async (id) => {
    if (!confirm('Archive task?')) return;
    await admin.deleteTask(id);
    setTasks(t => t.filter(x => x.id !== id));
  };

  const autoAssign = async () => {
    try { const d = await admin.autoAssign({}); setAutoLog(`✅ Assigned to ${d.teams} teams (${d.totalAssigned} total assignments)`); }
    catch(e) { setAutoLog('❌ ' + e.message); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem' }}>Tasks ({tasks.length})</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={autoAssign}><Zap size={16} /> Auto-Assign</button>
          <button className="btn btn-crew" onClick={() => setShowForm(v => !v)}><Plus size={16} /> New Task</button>
        </div>
      </div>

      {autoLog && <div className="card" style={{ marginBottom: 16, color: autoLog.startsWith('✅') ? 'var(--crew-primary)' : 'var(--imposter-primary)', borderColor: autoLog.startsWith('✅') ? 'var(--border-crew)' : 'var(--border-imposter)' }}>{autoLog}</div>}

      {showForm && (
        <form className="card" style={{ marginBottom: '1.5rem' }} onSubmit={submit}>
          <h3 style={{ marginBottom: '1rem' }}>Create Task</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Title</label>
              <input className="input" required value={form.title} onChange={e => updateForm('title', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Task Type</label>
              <select className="select" value={form.task_type} onChange={e => updateForm('task_type', e.target.value)}>
                {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Difficulty</label>
              <select className="select" value={form.difficulty} onChange={e => updateForm('difficulty', e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Points</label>
              <input className="input" type="number" value={form.points} onChange={e => updateForm('points', +e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Time Limit (sec)</label>
              <input className="input" type="number" value={form.time_limit} onChange={e => updateForm('time_limit', +e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Question / Instructions</label>
              <textarea className="input" rows={3} value={form.configuration.question} onChange={e => updateConfig('question', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Correct Answer (auto-grade)</label>
              <input className="input" value={form.configuration.correctAnswer} onChange={e => updateConfig('correctAnswer', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hint (optional)</label>
              <input className="input" value={form.configuration.hint} onChange={e => updateConfig('hint', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-crew">Create Task</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div className="flex justify-center" style={{ padding: 40 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => (
            <div key={task.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{task.task_type}</span>
                  <span className="badge" style={{ fontSize: '0.65rem', color: diffColor[task.difficulty], background: `${diffColor[task.difficulty]}15`, border: `1px solid ${diffColor[task.difficulty]}40` }}>{task.difficulty}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--warning-primary)', fontWeight: 600 }}>{task.points}pts</span>
                  {task.time_limit && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.time_limit}s</span>}
                </div>
              </div>
              <button className="btn-icon" title="Delete" style={{ color: 'var(--imposter-primary)' }} onClick={() => del(task.id)}><Trash2 size={14} /></button>
            </div>
          ))}
          {tasks.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No tasks created yet.</p>}
        </div>
      )}
    </div>
  );
}
