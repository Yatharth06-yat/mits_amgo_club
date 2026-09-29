import { useState, useEffect } from 'react';
import { publicApi } from '../../services/api';
import { socket } from '../../socket/socketClient';
import styles from './ProjectorPage.module.css';

export default function ProjectorPage() {
  const [state, setGameState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activity, setActivity] = useState([]);
  const [meeting, setMeeting] = useState(null);
  const [victoryData, setVictoryData] = useState(null);

  const load = async () => {
    try {
      const [s, l, a] = await Promise.all([publicApi.state(), publicApi.leaderboard(), publicApi.activity()]);
      setGameState(s);
      setLeaderboard(Array.isArray(l) ? l : l.leaderboard || []);
      setActivity(Array.isArray(a) ? a : a.activity || []);
    } catch(e) {}
  };

  useEffect(() => {
    socket.emit('projector:join');
    load();

    const refresh = setInterval(load, 15000);

    socket.on('game:state', s => setGameState(prev => ({ ...prev, ...s })));
    socket.on('game:phase', ({ phase }) => setGameState(p => p ? { ...p, gamePhase: phase } : p));
    socket.on('game:over', ({ winner }) => { setVictoryData({ winner }); setGameState(p => p ? { ...p, winner, gamePhase: 'VICTORY' } : p); });
    socket.on('game:score_update', load);
    socket.on('meeting:called', (d) => setMeeting({ phase: 'DISCUSSION', ...d }));
    socket.on('meeting:voting_open', (d) => setMeeting(p => ({ ...p, phase: 'VOTING', ...d })));
    socket.on('meeting:result', (d) => { setMeeting({ phase: 'RESULT', ...d }); setTimeout(() => setMeeting(null), 8000); });
    socket.on('meeting:closed', () => setMeeting(null));
    socket.on('kill:approved', ({ victimName }) => {
      setActivity(a => [{ id: Date.now(), message: `☠️ ${victimName} has been eliminated!`, event_type:'TEAM_ELIMINATED', created_at: new Date().toISOString() }, ...a].slice(0, 20));
      load();
    });

    return () => {
      clearInterval(refresh);
      socket.off('game:state'); socket.off('game:phase'); socket.off('game:over');
      socket.off('game:score_update'); socket.off('meeting:called');
      socket.off('meeting:voting_open'); socket.off('meeting:result');
      socket.off('meeting:closed'); socket.off('kill:approved');
    };
  }, []);

  const phase = state?.gamePhase || state?.phase || 'LOBBY';
  const phaseColor = { LOBBY:'#8B949E', ASSIGNMENT:'#8B5CF6', TASKS:'#22C55E', DISCUSSION:'#F59E0B', VOTING:'#3B82F6', RESULTS:'#06B6D4', VICTORY:'#F59E0B', PAUSED:'#8B949E', FINISHED:'#8B949E' }[phase] || '#8B949E';

  return (
    <div className={styles.projector}>
      {/* Victory overlay */}
      {(victoryData || state?.winner) && (
        <div className={styles.victoryOverlay}>
          <div className={styles.victoryInner}>
            <div className={styles.victoryEmoji}>{state?.winner === 'CREW' ? '🔵' : '🔴'}</div>
            <div className={styles.victoryTitle}>{state?.winner === 'CREW' ? 'CREW WINS!' : 'IMPOSTERS WIN!'}</div>
            <div className={styles.victorySub}>{state?.winner === 'CREW' ? 'The imposters have been eliminated. Crew prevails!' : 'The imposters have infiltrated and overwhelmed the crew!'}</div>
          </div>
        </div>
      )}

      {/* Meeting overlay */}
      {meeting && !victoryData && (
        <div className={styles.meetingOverlay}>
          <div className={styles.meetingInner}>
            <div className={styles.meetingEmoji}>🔔</div>
            <div className={styles.meetingTitle}>
              {meeting.phase === 'DISCUSSION' ? 'EMERGENCY MEETING' :
               meeting.phase === 'VOTING'     ? 'VOTING IN PROGRESS' :
               meeting.phase === 'RESULT'     ? (meeting.ejectedTeamId ? `TEAM EJECTED${meeting.wasImposter ? ' — WAS AN IMPOSTER' : ' — WAS NOT AN IMPOSTER'}` : 'VOTE TIED — NO EJECTION') : 'MEETING'}
            </div>
            {meeting.calledBy && <div className={styles.meetingSub}>Called by: {meeting.calledBy}</div>}
            {meeting.reason && <div className={styles.meetingReason}>"{meeting.reason}"</div>}
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.brand}>TASKFORCE <span style={{ color: 'var(--imposter-primary)' }}>TRAITORS</span></div>
        <div className={styles.phaseDisplay} style={{ color: phaseColor, borderColor: `${phaseColor}40`, background: `${phaseColor}10` }}>
          <span className="glow-dot" style={{ background: phaseColor, boxShadow: `0 0 8px ${phaseColor}` }} />
          {phase}
        </div>
        <div className={styles.clock}>{new Date().toLocaleTimeString()}</div>
      </div>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Leaderboard */}
        <div className={styles.leaderboard}>
          <h2 className={styles.sectionTitle}>🏆 LEADERBOARD</h2>
          <div className={styles.leaderList}>
            {leaderboard.slice(0, 10).map((team, idx) => (
              <div key={team.id} className={styles.leaderRow} style={{ opacity: team.alive ? 1 : 0.4 }}>
                <span className={styles.rank} style={{ color: idx === 0 ? 'var(--warning-primary)' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'var(--text-muted)' }}>#{idx + 1}</span>
                <span className={styles.teamCode}>{team.team_code}</span>
                <span className={styles.teamName}>{team.team_name}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={styles.taskProgress}>{team.tasks_completed}/{team.tasks_total}</span>
                  <span className={styles.score}>{team.score}</span>
                  {!team.alive && <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600 }}>OUT</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className={styles.activity}>
          <h2 className={styles.sectionTitle}>📡 LIVE FEED</h2>
          <div className={styles.activityList}>
            {activity.slice(0, 12).map((a, i) => (
              <div key={a.id || i} className={styles.activityItem} style={{ animationDelay: `${i * 0.05}s` }}>
                <span className={styles.activityTime}>{new Date(a.created_at).toLocaleTimeString()}</span>
                <span className={styles.activityMsg}>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className={styles.footer}>
        {[
          { label: 'Teams Alive', value: state?.aliveTeams ?? '—' },
          { label: 'Crew Alive',  value: state?.crewAlive  ?? '—', color: 'var(--crew-primary)' },
          { label: 'Imposters',   value: state?.imposterAlive ?? '—', color: 'var(--imposter-primary)' },
          { label: 'Tasks Done',  value: state?.completedTasks != null ? `${state.completedTasks}/${state.totalTasks}` : '—' },
        ].map(s => (
          <div key={s.label} className={styles.footerStat}>
            <div className={styles.footerValue} style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</div>
            <div className={styles.footerLabel}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
