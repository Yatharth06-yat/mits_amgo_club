import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Upload, ChevronDown, ChevronUp, Send, XCircle } from 'lucide-react';
import { volunteer as volApi } from '../../services/api';
import { socket } from '../../socket/socketClient';

const STATUS_COLOR = { ASSIGNED:'var(--text-muted)', IN_PROGRESS:'var(--info-primary)', SUBMITTED:'var(--warning-primary)', COMPLETED:'var(--crew-primary)', EXPIRED:'var(--text-faint)' };
const DIFF_COLOR = { EASY:'var(--crew-primary)', MEDIUM:'var(--info-primary)', HARD:'var(--warning-primary)', EXTREME:'var(--imposter-primary)' };

export default function VolunteerTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [answer, setAnswer] = useState({});
  const [proof, setProof] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [feedback, setFeedback] = useState({});

  const load = () => volApi.getTasks().then(d => setTasks(Array.isArray(d) ? d : d.tasks || [])).catch(console.error).finally(() => setLoading(false));
  useEffect(() => {
    load();
    socket.on('task:verified', load);
    return () => socket.off('task:verified', load);
  }, []);

  const startTask = async (assignmentId) => { await volApi.startTask(assignmentId); load(); };

  const submitTask = async (assignmentId, task) => {
    setSubmitting(assignmentId);
    try {
      await volApi.submitTask(assignmentId, {
        answer: answer[assignmentId] || '',
        proofUrl: proof[assignmentId] || null
      });
      setFeedback(f => ({ ...f, [assignmentId]: { ok: true, msg: 'Submitted successfully!' } }));
      load();
    } catch(e) { setFeedback(f => ({ ...f, [assignmentId]: { ok: false, msg: e.message } })); }
    finally { setSubmitting(null); }
  };

  if (loading) return <div className="flex justify-center" style={{ padding: 60 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: '1rem' }}>My Tasks ({tasks.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map(a => {
          const task = a.tasks;
          const statusColor = STATUS_COLOR[a.status] || 'var(--text-muted)';
          const isOpen = expanded === a.id;
          const sub = a.task_submissions?.[0];

          return (
            <div key={a.id} className="card" style={{ borderColor: a.status === 'COMPLETED' ? 'var(--crew-primary)40' : 'var(--border)', padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div onClick={() => setExpanded(isOpen ? null : a.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                {a.status === 'COMPLETED' ? <CheckCircle size={18} color="var(--crew-primary)" /> :
                 a.status === 'SUBMITTED' ? <Clock size={18} color="var(--warning-primary)" /> :
                 <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${statusColor}` }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>{task?.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="badge" style={{ fontSize: '0.65rem', color: DIFF_COLOR[task?.difficulty], background: `${DIFF_COLOR[task?.difficulty]}15`, border: `1px solid ${DIFF_COLOR[task?.difficulty]}30` }}>{task?.difficulty}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--warning-primary)', fontWeight: 600 }}>{task?.points}pts</span>
                    {task?.time_limit && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.time_limit}s</span>}
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: statusColor, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{a.status}</span>
                {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', marginTop: '1rem', lineHeight: 1.6 }}>
                    {task?.configuration?.question || task?.description}
                  </p>

                  {task?.configuration?.hint && (
                    <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--info-primary)' }}>
                      💡 {task.configuration.hint}
                    </div>
                  )}

                  {/* Feedback */}
                  {feedback[a.id] && (
                    <div style={{ background: feedback[a.id].ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${feedback[a.id].ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '1rem', fontSize: '0.85rem', color: feedback[a.id].ok ? 'var(--crew-primary)' : 'var(--imposter-primary)' }}>
                      {feedback[a.id].msg}
                    </div>
                  )}

                  {a.status === 'ASSIGNED' && (
                    <button className="btn btn-primary btn-sm" onClick={() => startTask(a.id)}>Start Task</button>
                  )}

                  {['IN_PROGRESS','ASSIGNED'].includes(a.status) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                      {['TRIVIA','MCQ','CODE_CRACKER','CIPHER','RIDDLE','SEQUENCE','PATTERN_MATCH'].includes(task?.task_type) && (
                        <input className="input" placeholder="Your answer..." value={answer[a.id] || ''} onChange={e => setAnswer(v => ({...v, [a.id]: e.target.value}))} />
                      )}
                      {['PHOTO_UPLOAD','PHYSICAL_VERIFICATION','TEAM_COORDINATION'].includes(task?.task_type) && (
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Upload Proof Photo</label>
                          <input type="file" accept="image/*" capture="environment" onChange={e => setProof(v => ({...v, [a.id]: e.target.files[0]}))} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} />
                        </div>
                      )}
                      <button className="btn btn-crew btn-sm" disabled={!!submitting} onClick={() => submitTask(a.id, task)}>
                        {submitting === a.id ? <span className="animate-spin" style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block' }} /> : <Send size={14} />}
                        Submit
                      </button>
                    </div>
                  )}

                  {sub && a.status === 'SUBMITTED' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--warning-primary)', marginTop: 10 }}>⏳ Awaiting volunteer verification...</p>
                  )}
                  {a.status === 'COMPLETED' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--crew-primary)', marginTop: 10 }}>✅ Completed! Points awarded.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {tasks.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No tasks assigned yet.</p>}
      </div>
    </div>
  );
}
