import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

export const registerBiometrics = async (userEmail) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/auth/webauthn/register/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: userEmail }),
    });
    const options = await resp.json();
    const attResp = await startRegistration(options);
    const verificationResp = await fetch(`${BASE_URL}/api/auth/webauthn/register/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: userEmail, body: attResp }),
    });
    const verificationJSON = await verificationResp.json();
    if (verificationJSON.verified) {
      alert('Устройство успешно привязано');
    } else {
      alert('Ошибка привязки устройства: ' + verificationJSON.error);
    }
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      alert('Действие отменено');
    } else {
      alert('Ошибка: ' + error.message);
    }
  }
};

export const loginWithBiometrics = async (userEmail) => {
  if (!userEmail) {
    return alert('Введите Email');
  }
  try {
    const resp = await fetch(`${BASE_URL}/api/auth/webauthn/login/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: userEmail }),
    });
    if (!resp.ok) {
      const error = await resp.json();
      return alert(error.error || 'Ошибка запроса');
    }
    const options = await resp.json();
    const asseResp = await startAuthentication(options);
    const verificationResp = await fetch(`${BASE_URL}/api/auth/webauthn/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: userEmail, body: asseResp }),
    });
    const verificationJSON = await verificationResp.json();
    if (verificationJSON.verified) {
      window.location.href = verificationJSON.redirectTo || '/admin';
    } else {
      alert('Ошибка верификации: ' + (verificationJSON.error || 'Неизвестная ошибка'));
    }
  } catch (error) {
    alert('Ошибка авторизации: ' + error.message);
  }
};