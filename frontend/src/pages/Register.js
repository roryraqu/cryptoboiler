import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../api/backendClient';

const interpretError = (error) => {
  if (!error) return 'Произошла неизвестная ошибка.';
  
  const { status, message } = error;
  const msgLower = (message || '').toLowerCase();

  if (status >= 500) return `Критическая ошибка сервера [Код ${status}]. Пожалуйста, обратитесь к администратору или повторите попытку позже.`;
  if (status === 429) return 'Превышен лимит запросов [Код 429]. Система временно заблокировала отправку, подождите несколько минут.';
  if (status === 404) return 'Сервис или эндпоинт временно недоступен [Код 404]. Проверьте настройки подключения.';
  if (status === 403) return 'Действие запрещено политикой безопасности [Код 403].';
  if (status === 401) return 'Сессия истекла или у вас нет прав на данное действие [Код 401].';
  if (status >= 400 && status < 500) {
    if (msgLower.includes('email, password and full name')) return 'Отклонено [Код 400]: Пожалуйста, заполните все обязательные поля корректно.';
    if (msgLower.includes('terms')) return 'Отклонено [Код 400]: Необходимо согласие на обработку данных.';
    if (msgLower.includes('already exists')) return 'Отклонено [Код 400]: Пользователь с таким Email адресом уже зарегистрирован в системе.';
    return `Ошибка валидации запроса [Код ${status}]: ${message}`;
  }

  return `Сетевая ошибка связи с сервером: ${message}`;
};

const calculateStrength = (pwd) => {
  let score = 0;
  let missing = [];

  if (!pwd) return { score: 0, missing: [] };

  if (pwd.length >= 8) score += 1;
  else missing.push('минимум 8 символов');

  if (/[A-Z]/.test(pwd)) score += 1;
  else missing.push('заглавную букву');

  if (/[a-z]/.test(pwd)) score += 1;
  else missing.push('строчную букву');

  if (/[0-9]/.test(pwd)) score += 1;
  else missing.push('цифру');

  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  else missing.push('спецсимвол');

  return { score, missing };
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const strength = calculateStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const canSubmit = strength.score >= 4 && passwordsMatch && agreedToTerms && email && fullName;

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    if (strength.score < 4) {
      setMessage({ type: 'error', text: 'Уровень защиты пароля слишком низкий. Следуйте подсказкам индикатора.' });
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setMessage({ type: 'error', text: 'Введенные пароли не совпадают.' });
      setIsLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setMessage({ type: 'error', text: 'Для продолжения необходимо дать согласие на обработку персональных данных.' });
      setIsLoading(false);
      return;
    }

    const { error } = await api.auth.signUp({ email, password, options: { data: { full_name: fullName, agreedToTerms } } });

    if (error) {
      setMessage({ type: 'error', text: interpretError(error) });
      setIsLoading(false);
      return;
    }
    
    setMessage({ type: 'success', text: 'Заявка успешно отправлена! Ожидайте подтверждения администратором.' });
    setTimeout(() => navigate('/login'), 3000);
  };

  const getBarColor = (level) => {
    if (strength.score === 0) return 'bg-slate-200';
    if (strength.score < 3) return strength.score >= level ? 'bg-red-500' : 'bg-slate-200';
    if (strength.score < 5) return strength.score >= level ? 'bg-yellow-500' : 'bg-slate-200';
    return strength.score >= level ? 'bg-emerald-500' : 'bg-slate-200';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e6e8ec] px-4 py-12 relative">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-6 text-center">Запрос доступа</h1>
        {message.text && <div className={`mb-6 px-4 py-3 rounded-lg text-sm text-center border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>{message.text}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <Input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="ФИО полностью" required />
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Рабочая почта" required />
          
          <div className="pt-2">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Создайте пароль" required />
            <div className="flex gap-1 h-1.5 mt-2 mb-1">
              {[1, 2, 3, 4, 5].map(lvl => (
                <div key={lvl} className={`flex-1 rounded-full transition-colors ${getBarColor(lvl)}`} />
              ))}
            </div>
            {password && strength.missing.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                Для надежности добавьте: <span className="text-orange-500">{strength.missing.join(', ')}</span>
              </p>
            )}
          </div>

          <div>
            <Input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Повторите пароль" 
              required 
              className={`transition-colors ${confirmPassword && !passwordsMatch ? 'border-red-300 bg-red-50 focus:border-red-500' : confirmPassword && passwordsMatch ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-500' : ''}`} 
            />
            {confirmPassword && !passwordsMatch && <p className="text-[11px] text-red-600 mt-1">Введенные пароли не совпадают</p>}
          </div>

          <div className="flex items-start gap-3 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center h-5 mt-0.5">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white cursor-pointer"
              />
            </div>
            <label htmlFor="terms" className="text-[11px] text-slate-500 leading-snug">
              Я ознакомлен и даю{' '}
              <span onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-blue-600 hover:text-blue-700 underline cursor-pointer">
                согласие на обработку персональных данных
              </span>.
            </label>
          </div>

          <Button type="submit" disabled={isLoading || !canSubmit} className="w-full mt-6">
            {isLoading ? 'Отправка...' : 'Подать заявку'}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-slate-500 text-sm">
          Уже есть доступ? <Link to="/login" className="text-blue-600 hover:text-blue-700">Войти в систему</Link>
        </p>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh]">
            <div className="p-6 overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Политика обработки персональных данных</h2>
              <div className="space-y-4 text-sm text-slate-600">
                <p><strong>1. Собираемые данные:</strong> В рамках использования закрытого контура мониторинга ИБ мы собираем следующие данные: ФИО, корпоративный адрес электронной почты, зашифрованный хэш пароля, ключи биометрической аутентификации и логи действий.</p>
                <p><strong>2. Цели обработки:</strong> Обеспечение строгого пропускного режима, аутентификация сотрудников для доступа к промышленному оборудованию, ведение системного аудита и предотвращение инцидентов безопасности.</p>
                <p><strong>3. Безопасность и хранение:</strong> Все данные хранятся на внутренних серверах в изолированной сети. Биометрическая информация обрабатывается исключительно на вашем личном устройстве, сервер получает только обезличенный криптографический публичный ключ.</p>
                <p><strong>4. Права пользователя:</strong> Вы имеете право в любой момент запросить удаление вашей учетной записи и истории действий, обратившись к Администратору безопасности или Начальнику смены.</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button onClick={() => setShowTermsModal(false)}>Ознакомлен(а) и согласен(а)</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}