import { supabase } from '../lib/supabase';

/**
 * Socket.io compatibility layer using Supabase Realtime
 */
export const socket = {
  emit: (event, payload) => {
    // Forward events to Supabase Realtime broadcast or edge functions if needed
  },

  on: (event, callback) => {
    // Map socket events to Supabase Realtime postgres_changes listeners
    if (event === 'game:phase' || event === 'game:state') {
      supabase.channel('game_state_compat')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, (p) => {
          callback({ phase: p.new.phase, status: p.new.phase });
        })
        .subscribe();
    }
  },

  off: () => {
    // Cleanup helper
  }
};
