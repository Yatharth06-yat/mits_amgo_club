import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState(null);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [killAlert, setKillAlert] = useState(null);

  const addNotification = useCallback((notif) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notif, id }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  // Fetch initial game state from Supabase
  const fetchGameState = useCallback(async () => {
    const { data: game, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching game_state:', error);
      return;
    }

    if (game) {
      setGameState({
        id: game.id,
        status: game.phase,
        gamePhase: game.phase,
        roundNumber: game.round_number,
        meetingId: game.meeting_id
      });
    }
  }, []);

  useEffect(() => {
    fetchGameState();

    // Subscribe to Supabase Realtime channel for game events
    const channel = supabase
      .channel('public_game_state_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload) => {
        const game = payload.new;
        if (game) {
          setGameState(prev => ({
            ...prev,
            status: game.phase,
            gamePhase: game.phase,
            roundNumber: game.round_number,
            meetingId: game.meeting_id
          }));

          if (game.phase === 'FINISHED') {
            addNotification({
              type: 'victory',
              title: 'GAME OVER',
              message: 'Game has concluded!'
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const m = payload.new;
          if (m.phase !== 'CLOSED') {
            setActiveMeeting(m);
            if (m.phase === 'VOTING') {
              addNotification({ type: 'info', title: '🗳️ VOTING OPEN', message: 'Cast your vote now!' });
            } else {
              addNotification({ type: 'warning', title: '🔔 EMERGENCY MEETING', message: m.reason || 'Meeting called!' });
            }
          } else {
            setActiveMeeting(null);
            if (m.voted_out_team_id) {
              addNotification({
                type: 'danger',
                title: '📢 MEETING RESULT',
                message: `Team eliminated! Was imposter: ${m.was_imposter ? 'YES' : 'NO'}`
              });
            } else {
              addNotification({ type: 'info', title: '📢 MEETING RESULT', message: 'Vote tied — no ejection' });
            }
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
        const log = payload.new;
        if (log.is_public) {
          addNotification({ type: 'info', title: log.event_type, message: log.message });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGameState, addNotification]);

  return (
    <GameContext.Provider value={{ gameState, activeMeeting, notifications, killAlert, setKillAlert, addNotification }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
