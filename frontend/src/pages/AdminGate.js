import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { loginWithBiometrics } from '../utils/passkey';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../api/backendClient';

export default function AdminGate() {
  const { user, role, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometric, setIsBiometric] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (role === 'admin') {
      window.location.href = '/admin';
      return;
    }
    if (role) {
      logout();
      setError('КРИТИЧЕСКАЯ ОШИБКА: Доступ отклонен.');
    }
  }, [user, role, logout]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isBiometric) {
      await loginWithBiometrics(email);
      setIsLoading(false);
      return;
    }

    const { data, error: authError } = await api.auth.signInWithPassword({ email, password });

    if (authError) {
      await api.from('audit_logs').insert({ user_id: null, action: 'ADMIN_GATE_LOGIN_FAILED', details: { email, error: authError.message } });
      setError('Ошибка аутентификации.');
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await api.from('profiles').select('role').eq('id', data.user.id).single();

    if (profileError || profile?.role !== 'admin') {
      await api.from('audit_logs').insert({ user_id: data.user.id, action: 'ADMIN_GATE_LOGIN_FAILED', details: { email, reason: 'invalid admin role' } });
      await api.auth.signOut();
      setError('КРИТИЧЕСКАЯ ОШИБКА: Доступ отклонен.');
      setIsLoading(false);
      return;
    }

    await api.from('audit_logs').insert({ user_id: data.user.id, action: 'ADMIN_GATE_LOGIN', details: {} });
    window.location.href = '/admin';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e6e8ec] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">Администраторский шлюз</h2>
        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">{error}</div>}
        <form onSubmit={handleAdminLogin} className="space-y-6">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@security.local" required />
          
          {!isBiometric && (
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Верификация...' : isBiometric ? 'Войти по ключу доступа' : 'Авторизоваться'}
          </Button>
        </form>
        
        <div className="mt-6 border-t border-slate-200 pt-6">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setIsBiometric(!isBiometric)}
          >
            {isBiometric ? 'Войти обычным способом' : 'Использовать ключ доступа'}
          </Button>
        </div>

        <p className="mt-6 text-center"><Link to="/login" className="text-slate-500 hover:text-slate-700 underline text-xs">Вернуться к стандартному порталу</Link></p>
      </div>
    </div>
  );
}