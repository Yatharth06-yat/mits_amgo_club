import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check current Supabase Auth Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'admin',
          teamId: session.user.user_metadata?.teamId || null
        };
        setUser(u);
        localStorage.setItem('tt_user', JSON.stringify(u));
      } else {
        // Fallback to localStorage saved user if available
        const saved = localStorage.getItem('tt_user');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            localStorage.removeItem('tt_user');
          }
        }
      }
      setLoading(false);
    });

    // 2. Listen to Supabase Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'admin',
          teamId: session.user.user_metadata?.teamId || null
        };
        setUser(u);
        localStorage.setItem('tt_user', JSON.stringify(u));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (authData) => {
    let userObj;
    if (authData?.user) {
      userObj = {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.user_metadata?.role || authData.role || 'admin',
        team: authData.team || null
      };
    } else if (authData && typeof authData === 'object') {
      userObj = {
        id: authData.team?.id || 'admin-id',
        email: authData.username || authData.teamCode || 'admin',
        role: authData.role || 'admin',
        team: authData.team || null
      };
    } else {
      userObj = {
        id: 'admin-id',
        email: 'admin',
        role: 'admin'
      };
    }
    setUser(userObj);
    localStorage.setItem('tt_user', JSON.stringify(userObj));
    return userObj;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.removeItem('tt_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
