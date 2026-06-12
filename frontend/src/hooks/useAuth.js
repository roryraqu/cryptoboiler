import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/backendClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await api
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      return error ? null : data?.role || null;
    } catch {
      return null;
    }
  }, []);

  const finalizeSession = useCallback(async (session) => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      setUser(session.user);
      const userRole = await fetchUserRole(session.user.id);
      setRole(userRole || null);
    } catch (error) {
      console.error("Ошибка при получении роли:", error);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [fetchUserRole]);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      try {
        const { data: { session } } = await api.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          await finalizeSession(session);
        } else {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Критическая ошибка инициализации сессии:', error);
        if (!cancelled) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    };

    initSession();

    return () => {
      cancelled = true;
    };
  }, [finalizeSession]);

  const logout = async () => {
    try {
      if (user?.id) {
        await api.from('audit_logs').insert({
          user_id: user.id,
          action: 'USER_LOGOUT',
          details: { client: 'web_portal', user_agent: navigator.userAgent }
        });
      }
      await api.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      setRole(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 font-sans text-lg">
          Загрузка системы...
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);