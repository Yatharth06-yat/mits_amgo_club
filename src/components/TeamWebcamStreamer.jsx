import { useEffect, useRef, useState } from 'react';
import { CameraOff, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function TeamWebcamStreamer() {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const streamRef = useRef(null);

  const team = user?.team || {};
  const teamId = team.id || user?.id || 'unknown';
  const teamName = team.team_name || user?.email || 'Team';
  const teamCode = team.team_code || `T${String(team.team_number || 1).padStart(2, '0')}`;
  const teamRole = team.role || 'CREW';

  useEffect(() => {
    let channel = null;
    let frameInterval = null;

    async function initCamera() {
      try {
        setCameraError(null);
        // Request user camera (320x240 ideal for lightweight CCTV surveillance)
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          },
          audio: false
        });

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }
        setStreamActive(true);

        // Join Supabase Realtime Broadcast channel for CCTV surveillance
        channel = supabase.channel('cctv_surveillance', {
          config: { broadcast: { self: false } }
        });

        channel.subscribe(status => {
          if (status === 'SUBSCRIBED') {
            // Send frames every 1.5 seconds
            frameInterval = setInterval(() => {
              captureAndSendFrame(channel);
            }, 1500);
          }
        });
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError(err.message || 'Camera permission denied or camera unavailable');
        setStreamActive(false);
      }
    }

    function captureAndSendFrame(broadcastChannel) {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = 240;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/jpeg', 0.5);

      broadcastChannel.send({
        type: 'broadcast',
        event: 'cctv_frame',
        payload: {
          teamId,
          teamName,
          teamCode,
          teamRole,
          frame: frameData,
          timestamp: Date.now()
        }
      }).catch(e => console.debug('CCTV frame send issue:', e));
    }

    initCamera();

    return () => {
      if (frameInterval) clearInterval(frameInterval);
      if (channel) supabase.removeChannel(channel);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [teamId, teamName, teamCode, teamRole]);

  return (
    <>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Floating Team Webcam Widget */}
      <div
        style={{
          position: 'fixed',
          bottom: 75,
          right: 16,
          zIndex: 999,
          background: 'rgba(15, 23, 42, 0.95)',
          border: `1px solid ${streamActive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
          width: isMinimized ? 160 : 200,
          fontFamily: 'var(--font-sans, system-ui)'
        }}
      >
        {/* Header bar */}
        <div
          style={{
            padding: '6px 10px',
            background: 'rgba(30, 41, 59, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.72rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: streamActive ? '#22c55e' : '#ef4444',
                boxShadow: streamActive ? '0 0 8px #22c55e' : 'none',
                animation: streamActive ? 'pulse 2s infinite' : 'none'
              }}
            />
            <span style={{ color: '#e2e8f0', fontWeight: 600, letterSpacing: '0.04em' }}>
              {streamActive ? 'LIVE CCTV' : 'CAM OFFLINE'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>

        {/* Video feed or error */}
        {!isMinimized && (
          <div style={{ position: 'relative', width: '100%', height: 140, background: '#090d16' }}>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirror effect
                display: streamActive ? 'block' : 'none'
              }}
            />

            {!streamActive && (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.7rem'
                }}
              >
                <CameraOff size={24} color="#ef4444" style={{ marginBottom: 6 }} />
                <span>{cameraError ? 'Camera Denied' : 'Connecting camera...'}</span>
                {cameraError && (
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      marginTop: 6,
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: '0.65rem',
                      cursor: 'pointer'
                    }}
                  >
                    Allow & Retry
                  </button>
                )}
              </div>
            )}

            {/* Scanline overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                backgroundSize: '100% 4px',
                opacity: 0.6
              }}
            />

            {/* Label watermark */}
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                left: 6,
                fontSize: '0.62rem',
                color: 'rgba(255, 255, 255, 0.7)',
                fontFamily: 'monospace',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '1px 5px',
                borderRadius: 3
              }}
            >
              {teamCode} · REC ●
            </div>
          </div>
        )}
      </div>
    </>
  );
}
