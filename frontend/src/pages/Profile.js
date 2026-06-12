import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { registerBiometrics } from '../utils/passkey';
import api from '../api/backendClient';

export default function Profile({ onBack }) {
  const { user } = useAuth();
  const [displayRole, setDisplayRole] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    async function fetchProfileAndBiometrics() {
      const { data: profile } = await api.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setDisplayRole(profile.role);

      const { data: authenticators } = await api.from('user_authenticators').select('id').eq('user_email', user.email);
      if (authenticators && authenticators.length > 0) {
        setHasBiometrics(true);
      }
    }
    fetchProfileAndBiometrics();
  }, [user]);

  const handleDisconnect = async () => {
    if (!window.confirm('Отвязать ключ доступа для этого устройства?')) return;
    const { error } = await api.from('user_authenticators').delete().eq('user_email', user.email);
    if (!error) {
      setHasBiometrics(false);
      alert('Ключ доступа успешно отвязан');
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md mx-auto space-y-6 shadow-sm relative">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm transition-colors mb-2">
        ⇐ Вернуться назад
      </button>
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">Личный профиль</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider block mb-1">Email адрес</label>
          <p className="text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm">{user.email}</p>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase font-bold tracking-wider block mb-1">Роль в системе</label>
          <p className="text-slate-800 font-medium uppercase bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-sm tracking-wide">{displayRole || 'Пользователь'}</p>
        </div>
      </div>
      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Безопасность и ключи доступа</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Настройте беспарольный доступ в систему с помощью технологии Passkeys. Вы сможете мгновенно авторизоваться, используя встроенный сканер отпечатков пальцев, распознавание лица Face ID или PIN-код вашего устройства.
        </p>
        {hasBiometrics ? (
          <Button variant="danger" className="w-full py-2.5 font-semibold" onClick={handleDisconnect}>
            Отвязать ключ доступа
          </Button>
        ) : (
          <Button variant="secondary" className="w-full py-2.5 font-semibold" onClick={async () => {
            await registerBiometrics(user.email);
            const { data } = await api.from('user_authenticators').select('id').eq('user_email', user.email);
            if (data && data.length > 0) setHasBiometrics(true);
          }}>
            Настроить ключ доступа
          </Button>
        )}
      </div>
    </div>
  );
}