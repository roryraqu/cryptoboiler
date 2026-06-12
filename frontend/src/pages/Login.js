import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { loginWithBiometrics } from '../utils/passkey';
import api from '../api/backendClient';

export default function Login() {
  const { user, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometric, setIsBiometric] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (role === 'operator') {
      window.location.href = '/operator';
      return;
    }
    if (role === 'manager') {
      window.location.href = '/manager';
      return;
    }
  }, [user, role]);

  const handleLogin = async (e) => {
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
      await api.from('audit_logs').insert({ user_id: null, action: 'USER_LOGIN_FAILED', details: { email, error: authError.message } });
      setError('Неверные учетные данные');
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await api.from('profiles').select('role').eq('id', data.user.id).single();

    if (profile?.role === 'pending') {
      await api.auth.signOut();
      setError('Ваш аккаунт ожидает проверки.');
      setIsLoading(false);
      return;
    }

    if (profileError || profile?.role === 'admin') {
      await api.auth.signOut();
      setError('Доступ запрещен. Используйте шлюз администратора.');
      setIsLoading(false);
      return;
    }

    await api.from('audit_logs').insert({ user_id: data.user.id, action: 'USER_LOGIN', details: {} });
    if (profile.role === 'operator') window.location.href = '/operator';
    if (profile.role === 'manager') window.location.href = '/manager';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e6e8ec] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <h2 className="text-3xl font-bold text-slate-800 text-center mb-8">Вход в систему</h2>
        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.local" required />
          {!isBiometric && (
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Проверка...' : isBiometric ? 'Войти по биометрии' : 'Авторизоваться'}
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

        <p className="mt-6 text-center text-slate-500 text-sm">
          Нет доступа? <Link to="/register" className="text-blue-600 hover:text-blue-700">Подать заявку</Link>
        </p>
      </div>
    </div>
  );
}