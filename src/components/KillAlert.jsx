import { useState } from 'react';
import { volunteer as volApi } from '../services/api';

export default function KillAlert({ data }) {
  const [acked, setAcked] = useState(false);
  const [loading, setLoading] = useState(false);

  const acknowledge = async () => {
    setLoading(true);
    try { await volApi.ackKill(data.killId); setAcked(true); }
    catch(e) { alert(e.message); }
    finally { setLoading(false); }
  };

  if (acked) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ background: 'var(--bg-panel)', border: '2px solid var(--imposter-primary)', borderRadius: 'var(--radius-xl)', padding: '2rem', maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 0 40px rgba(239,68,68,0.3)', animation: 'scaleIn 0.3s ease' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem', animation: 'flash 0.8s infinite' }}>⚠️</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--imposter-primary)', fontSize: '1.5rem', marginBottom: '0.75rem' }}>YOU HAVE BEEN TARGETED</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {data.message || 'An imposter has reported a kill against your team. Acknowledge within the time window.'}
        </p>
        {data.ackDeadline && (
          <p style={{ fontSize: '0.8rem', color: 'var(--warning-primary)', marginBottom: '1.5rem' }}>
            ⏰ Deadline: {new Date(data.ackDeadline).toLocaleTimeString()}
          </p>
        )}
        <button className="btn btn-danger btn-lg btn-block" onClick={acknowledge} disabled={loading}>
          {loading ? '...' : 'ACKNOWLEDGE KILL ATTEMPT'}
        </button>
      </div>
    </div>
  );
}
