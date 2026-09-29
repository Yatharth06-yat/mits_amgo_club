import { useState, useEffect } from 'react';
import { Star, Target, Shield, Award } from 'lucide-react';
import { team as teamApi } from '../../services/api';
import { useGame } from '../../context/GameContext';

export default function TeamDashboard() {
  const [me, setMe] = useState(null);
  const { gameState } = useGame();

  useEffect(() => { teamApi.me().then(d => setMe(d.team)).catch(console.error); }, []);

  if (!me) return <div className="flex justify-center" style={{ padding: 60 }}><div className="animate-spin" style={{ width:28,height:28,border:'2px solid var(--border-strong)',borderTopColor:'var(--crew-primary)',borderRadius:'50%' }} /></div>;

  const isImposter = me.role === 'IMPOSTER';
  const color = isImposter ? 'var(--imposter-primary)' : 'var(--crew-primary)';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Role card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem', border: `1px solid ${color}40`, boxShadow: `0 0 32px ${color}15` }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', marginBottom: 4 }}>
          {isImposter ? '🔴' : '🔵'}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 4 }}>YOUR ROLE</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color, marginBottom: 8 }}>
          {isImposter ? 'IMPOSTER' : 'CREW MEMBER'}
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 4 }}>{me.team_name || me.name}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Team Code: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{me.team_code || me.code}</strong>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        {[
          { label: 'Score', value: me.score || 0, icon: Star, color: 'var(--warning-primary)' },
          { label: me.alive ? 'Status: ALIVE' : 'ELIMINATED', value: me.alive ? '✓' : '✗', icon: Shield, color: me.alive ? 'var(--crew-primary)' : 'var(--text-muted)' },
          { label: 'Kills', value: me.kill_count || me.killCount || 0, icon: Target, color: 'var(--imposter-primary)' },
          { label: 'Achievements', value: me.achievements?.length || 0, icon: Award, color: 'var(--accent-purple)' }
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center' }}>
              <Icon size={18} color={s.color} style={{ margin: '0 auto 6px' }} />
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Players */}
      {me.players?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Team Members</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {me.players.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: color }}>{p.player_number}</div>
                <span style={{ fontWeight: 600 }}>{p.display_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game phase */}
      <div className="card-sm" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Game Phase</span>
        <span className="badge badge-info">{gameState?.gamePhase || 'LOBBY'}</span>
      </div>
    </div>
  );
}
