import { useState, useEffect } from 'react';
import { Shield, Star, Clock, Target } from 'lucide-react';
import { volunteer } from '../../services/api';
import { useGame } from '../../context/GameContext';

export default function VolunteerHome() {
  const [me, setMe] = useState(null);
  const [secrets, setSecrets] = useState(null);
  const { gameState } = useGame();

  useEffect(() => {
    volunteer.me().then(d => {
      setMe(d);
      if (d.team?.role === 'IMPOSTER') {
        volunteer.getSecretMissions().then(s => setSecrets(s.briefing)).catch(() => {});
      }
    }).catch(console.error);
  }, []);

  if (!me) return <div className="flex justify-center" style={{ padding: 60 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--info-primary)',borderRadius:'50%' }} /></div>;

  const isImposter = me.team?.role === 'IMPOSTER';
  const color = isImposter ? 'var(--imposter-primary)' : 'var(--crew-primary)';
  const phase = gameState?.gamePhase || 'LOBBY';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Role reveal card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem', border: `1px solid ${color}40`, boxShadow: `0 0 32px ${color}15` }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${color}15`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          {isImposter ? '🔴' : '🔵'}
          <span style={{ fontSize: '2rem' }}></span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 4 }}>YOUR ROLE</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 700, color, marginBottom: 8 }}>
          {isImposter ? 'IMPOSTER' : 'CREW'}
        </div>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{me.team?.team_name || me.team?.name}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{me.team?.team_code || me.team?.code}</strong></div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        {[
          { label: 'Score', value: me.team?.score || 0, icon: Star, color: 'var(--warning-primary)' },
          { label: 'Kills', value: me.team?.killCount || 0, icon: Target, color: 'var(--imposter-primary)' },
          { label: 'Status', value: me.team?.alive ? 'ALIVE' : 'OUT', icon: Shield, color: me.team?.alive ? 'var(--crew-primary)' : 'var(--text-muted)' }
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center' }}>
              <Icon size={18} color={s.color} style={{ margin: '0 auto 6px' }} />
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Game phase */}
      <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <Clock size={16} color="var(--text-muted)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phase: </span>
        <strong style={{ color: 'var(--info-primary)' }}>{phase}</strong>
      </div>

      {/* Imposter missions */}
      {isImposter && secrets && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <h3 style={{ color: 'var(--imposter-primary)', marginBottom: '0.75rem' }}>🎭 Secret Briefing</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>{secrets.briefing}</p>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700 }}>SECRET MISSIONS</h4>
          <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {secrets.secretMissions?.map((m, i) => (
              <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
