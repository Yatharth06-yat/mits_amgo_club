import { useState, useEffect } from 'react';
import { Video, VideoOff, RefreshCw, Maximize2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { admin } from '../../services/api';

export default function AdminCCTV() {
  const [teams, setTeams] = useState([]);
  const [frames, setFrames] = useState({}); // { [teamId]: { frame, timestamp, teamCode, teamName, teamRole } }
  const [loading, setLoading] = useState(true);
  const [selectedCam, setSelectedCam] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, ONLINE, IMPOSTER, CREW
  const [now, setNow] = useState(() => Date.now());

  // Heartbeat ticker to refresh online/offline status
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all registered teams
  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await admin.getTeams();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load teams for CCTV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();

    // Listen to live CCTV broadcast frames
    const channel = supabase.channel('cctv_surveillance', {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'cctv_frame' }, ({ payload }) => {
        if (!payload || !payload.teamId) return;
        setFrames(prev => ({
          ...prev,
          [payload.teamId]: {
            frame: payload.frame,
            timestamp: payload.timestamp || Date.now(),
            teamCode: payload.teamCode,
            teamName: payload.teamName,
            teamRole: payload.teamRole
          }
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isOnline = (teamId) => {
    const feed = frames[teamId];
    if (!feed) return false;
    return now - feed.timestamp < 6000; // online if frame in last 6 seconds
  };

  const onlineCount = teams.filter(t => isOnline(t.id)).length;

  const filteredTeams = teams.filter(t => {
    const online = isOnline(t.id);
    const roleUpper = (t.role || 'CREW').toUpperCase();

    if (filter === 'ONLINE') return online;
    if (filter === 'IMPOSTER') return roleUpper === 'IMPOSTER';
    if (filter === 'CREW') return roleUpper === 'CREW';
    return true;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Video size={28} color="#ef4444" />
            Live CCTV Surveillance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Real-time security webcam feeds from all participating teams
          </p>
        </div>

        {/* Status bar & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.8rem'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: onlineCount > 0 ? '#22c55e' : '#64748b', boxShadow: onlineCount > 0 ? '0 0 8px #22c55e' : 'none' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Active Cams: <strong style={{ color: '#fff' }}>{onlineCount} / {teams.length}</strong>
            </span>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 2 }}>
            {['ALL', 'ONLINE', 'IMPOSTER', 'CREW'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? 'var(--primary, #3b82f6)' : 'transparent',
                  color: filter === f ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <button onClick={loadTeams} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grid of Monitors */}
      {loading && teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border-strong)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Connecting CCTV security cameras...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No teams found. Register teams in the Teams tab first.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16
          }}
        >
          {filteredTeams.map(t => {
            const feed = frames[t.id];
            const online = isOnline(t.id);
            const roleUpper = (t.role || 'CREW').toUpperCase();
            const isImposter = roleUpper === 'IMPOSTER';

            return (
              <div
                key={t.id}
                onClick={() => feed && setSelectedCam({ team: t, feed })}
                style={{
                  background: '#0a0e17',
                  border: `1px solid ${online ? (isImposter ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)') : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  cursor: feed ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  position: 'relative'
                }}
              >
                {/* Camera Screen Header */}
                <div
                  style={{
                    padding: '8px 10px',
                    background: '#131b2e',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: online ? '#22c55e' : '#64748b',
                        boxShadow: online ? '0 0 6px #22c55e' : 'none'
                      }}
                    />
                    <span style={{ color: '#fff' }}>CAM-{String(t.team_number || 1).padStart(2, '0')}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>
                      ({t.team_name})
                    </span>
                  </div>

                  {/* Admin Secret Role Badge */}
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isImposter ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                      color: isImposter ? '#f87171' : '#4ade80',
                      border: `1px solid ${isImposter ? '#ef4444' : '#22c55e'}`
                    }}
                  >
                    {roleUpper}
                  </span>
                </div>

                {/* Video Monitor Frame */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 170,
                    background: '#05070c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {online && feed?.frame ? (
                    <img
                      src={feed.frame}
                      alt={t.team_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>
                      <VideoOff size={28} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
                      <span>NO SIGNAL / DISCONNECTED</span>
                    </div>
                  )}

                  {/* CRT CCTV Scanline effect */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%)',
                      backgroundSize: '100% 4px',
                      opacity: 0.7
                    }}
                  />

                  {/* CCTV Screen Watermark */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 8,
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                      color: online ? '#22c55e' : '#94a3b8',
                      background: 'rgba(0, 0, 0, 0.6)',
                      padding: '2px 5px',
                      borderRadius: 3
                    }}
                  >
                    {online ? '● LIVE' : 'SIGNAL LOST'}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 8,
                      fontSize: '0.62rem',
                      fontFamily: 'monospace',
                      color: 'rgba(255, 255, 255, 0.7)',
                      background: 'rgba(0, 0, 0, 0.6)',
                      padding: '2px 5px',
                      borderRadius: 3
                    }}
                  >
                    {online ? new Date(feed.timestamp).toLocaleTimeString() : '--:--:--'}
                  </div>

                  {feed && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 8,
                        background: 'rgba(0,0,0,0.6)',
                        padding: 3,
                        borderRadius: 3,
                        color: '#94a3b8'
                      }}
                    >
                      <Maximize2 size={12} />
                    </div>
                  )}
                </div>

                {/* Footer details */}
                <div
                  style={{
                    padding: '6px 10px',
                    background: '#0d1322',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>PIN: <strong style={{ color: '#fff' }}>{t.pin_hash || '123456'}</strong></span>
                  <span style={{ color: t.status === 'active' ? '#4ade80' : '#f87171' }}>
                    {t.status === 'active' ? '● Alive' : '† Eliminated'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded Camera Modal */}
      {selectedCam && (
        <div
          onClick={() => setSelectedCam(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 14,
              maxWidth: 720,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '12px 16px',
                background: '#131b2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
                  CAM-{String(selectedCam.team.team_number || 1).padStart(2, '0')}: {selectedCam.team.team_name}
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: selectedCam.team.role === 'imposter' ? '#ef4444' : '#22c55e',
                    color: '#fff'
                  }}
                >
                  {(selectedCam.team.role || 'CREW').toUpperCase()}
                </span>
              </div>

              <button
                onClick={() => setSelectedCam(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Video Frame */}
            <div style={{ position: 'relative', width: '100%', height: 420, background: '#000' }}>
              <img
                src={selectedCam.feed.frame}
                alt={selectedCam.team.team_name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                  backgroundSize: '100% 4px',
                  opacity: 0.5
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 14,
                  fontFamily: 'monospace',
                  color: '#fff',
                  fontSize: '0.8rem',
                  background: 'rgba(0, 0, 0, 0.7)',
                  padding: '4px 10px',
                  borderRadius: 4
                }}
              >
                TARGET: {selectedCam.team.team_name} · LAST UPDATED: {new Date(selectedCam.feed.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
