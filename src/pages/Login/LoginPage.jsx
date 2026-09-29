import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Fingerprint, Eye, EyeOff, Zap } from 'lucide-react';
import { auth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';

const TABS = [
  { id: 'admin',     label: 'Admin',     icon: Shield,      color: '#EF4444' },
  { id: 'volunteer', label: 'Volunteer',  icon: Users,       color: '#3B82F6' },
  { id: 'team',      label: 'Team',       icon: Fingerprint, color: '#22C55E' },
];

export default function LoginPage() {
  const [tab, setTab] = useState('admin');
  const [form, setForm] = useState({ username: '', password: '', teamCode: '', pin: '' });
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = tab === 'admin'
        ? { type: 'admin', username: form.username, password: form.password }
        : { type: tab, teamCode: form.teamCode.toUpperCase(), pin: form.pin };

      const data = await auth.login(payload);
      login(data);
      navigate(data.redirect || `/${tab}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Animated background */}
      <div className={styles.bgOrbs}>
        <div className={styles.orb} style={{ '--c': '#EF444420', '--x': '10%', '--y': '20%' }} />
        <div className={styles.orb} style={{ '--c': '#3B82F620', '--x': '70%', '--y': '60%' }} />
        <div className={styles.orb} style={{ '--c': '#22C55E15', '--x': '40%', '--y': '80%' }} />
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <Zap size={28} color="#EF4444" />
          </div>
          <h1 className={styles.title}>TASKFORCE</h1>
          <p className={styles.subtitle}>TRAITORS</p>
          <p className={styles.tagline}>Campus Social Deduction Platform</p>
        </div>

        {user && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '10px 14px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              Session: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{user.email || user.role}</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate(`/${user.role}`)}
              style={{
                background: 'var(--primary, #3b82f6)',
                border: 'none',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Go to Dashboard →
            </button>
          </div>
        )}

        {/* Role Tabs */}
        <div className={styles.tabs}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                style={tab === t.id ? { '--tab-color': t.color } : {}}
                onClick={() => { setTab(t.id); setError(''); }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {tab === 'admin' && (
            <>
              <div className={styles.field}>
                <label>Username</label>
                <input className="input" value={form.username} onChange={e => update('username', e.target.value)}
                  placeholder="admin" autoComplete="username" required />
              </div>
              <div className={styles.field}>
                <label>Password</label>
                <div className={styles.inputWrap}>
                  <input className="input" type={showPin ? 'text' : 'password'}
                    value={form.password} onChange={e => update('password', e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPin(v => !v)}>
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
          {(tab === 'volunteer' || tab === 'team') && (
            <>
              <div className={styles.field}>
                <label>Team Code</label>
                <input className="input" value={form.teamCode} onChange={e => update('teamCode', e.target.value)}
                  placeholder="e.g. T07" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  maxLength={6} required />
              </div>
              <div className={styles.field}>
                <label>PIN</label>
                <div className={styles.inputWrap}>
                  <input className="input" type={showPin ? 'text' : 'password'}
                    value={form.pin} onChange={e => update('pin', e.target.value)}
                    placeholder="6-digit PIN" maxLength={6} inputMode="numeric"
                    pattern="[0-9]{6}" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPin(v => !v)}>
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={`btn btn-lg btn-block ${tab === 'admin' ? 'btn-danger' : tab === 'volunteer' ? 'btn-primary' : 'btn-crew'}`}
            disabled={loading}>
            {loading ? <span className="animate-spin" style={{ width:18,height:18,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block' }} /> : null}
            {loading ? 'Authenticating...' : `Enter as ${TABS.find(t=>t.id===tab)?.label}`}
          </button>
        </form>

        <p className={styles.footer}>Taskforce Traitors v2.0 • Supabase Powered</p>
      </div>
    </div>
  );
}
