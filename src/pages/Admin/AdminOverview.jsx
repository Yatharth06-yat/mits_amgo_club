import { useState, useEffect } from 'react';
import { Users, Zap, Target, Shield, Skull, Clock, AlertCircle, TrendingUp, Activity, Award } from 'lucide-react';
import { admin } from '../../services/api';
import { useGame } from '../../context/GameContext';
import styles from './AdminOverview.module.css';

function StatCard({ icon: Icon, label, value, color = 'var(--info-primary)', sub }) {
  return (
    <div className={styles.statCard} style={{ '--accent': color }}>
      <div className={styles.statIcon}><Icon size={20} color={color} /></div>
      <div className={styles.statValue}>{value ?? '—'}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const { gameState } = useGame();

  const load = async () => {
    try {
      const d = await admin.overview();
      setOverview(d);
    } catch (err) {
      console.error("Supabase error in AdminOverview:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);
      console.error("Error details:", err?.details);
      console.error("Error hint:", err?.hint);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (gameState) load(); }, [gameState?.gamePhase]);

  if (loading) return <div className={styles.loading}><div className="animate-spin" style={{ width:32,height:32,border:'3px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div>;

  const phase = overview?.gamePhase || overview?.phase || 'LOBBY';
  const taskPct = overview?.totalTasks > 0 ? Math.round((overview.completedTasks / overview.totalTasks) * 100) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Command Overview</h1>
        <div className="flex items-center gap-3">
          <span className="glow-dot" style={{ background: phase === 'TASKS' ? 'var(--crew-primary)' : phase === 'VOTING' ? 'var(--info-primary)' : 'var(--text-muted)', boxShadow: `0 0 8px currentColor` }} />
          <span className="badge badge-info">{phase}</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={Users}    label="Total Teams"     value={overview?.totalTeams}    color="var(--info-primary)" />
        <StatCard icon={Shield}   label="Crew Alive"      value={overview?.crewAlive}     color="var(--crew-primary)"     sub={`of ${overview?.crewAlive + (overview?.crewTotal - overview?.crewAlive)} crew`} />
        <StatCard icon={Skull}    label="Imposters Alive" value={overview?.imposterAlive} color="var(--imposter-primary)" sub={`of ${overview?.imposterAlive + (overview?.imposterTotal - overview?.imposterAlive) || 0} imposters`} />
        <StatCard icon={Target}   label="Tasks Done"      value={`${overview?.completedTasks || 0}/${overview?.totalTasks || 0}`} color="var(--accent-cyan)" sub={`${taskPct}% complete`} />
        <StatCard icon={Clock}    label="Pending Verify"  value={overview?.pendingVerif}  color="var(--warning-primary)" />
        <StatCard icon={AlertCircle} label="Pending Kills" value={overview?.pendingKills} color="var(--imposter-primary)" />
        <StatCard icon={Activity} label="Active Meeting"  value={overview?.activeMeeting ? 'YES' : 'None'} color={overview?.activeMeeting ? 'var(--warning-primary)' : 'var(--text-muted)'} />
        <StatCard icon={TrendingUp} label="Game Phase"   value={phase} color="var(--accent-purple)" />
      </div>

      {/* Task progress bar */}
      {overview?.totalTasks > 0 && (
        <div className={styles.progressSection}>
          <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
            <span className="text-sm font-semibold">Crew Task Completion</span>
            <span className="text-sm text-muted">{overview.completedTasks} / {overview.totalTasks} ({taskPct}%)</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${taskPct}%` }} />
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className={styles.quickGrid}>
        {[
          { label: 'Pending Kills',    count: overview?.pendingKills,  color: 'var(--imposter-primary)', href: '/admin/kills' },
          { label: 'Verify Queue',     count: overview?.pendingVerif,  color: 'var(--warning-primary)',  href: '/admin/submissions' },
          { label: 'Active Meeting',   count: overview?.activeMeeting ? 1 : 0, color: 'var(--info-primary)', href: '/admin/meetings' },
        ].map(q => (
          <a key={q.label} href={q.href} className={styles.quickCard} style={{ '--qc': q.color }}>
            <div className={styles.quickCount} style={{ color: q.color }}>{q.count || 0}</div>
            <div className={styles.quickLabel}>{q.label}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
