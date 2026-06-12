const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { query } = require('../db');
const authService = require('../services/authService');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const router = express.Router();
const rpName = requireEnv('RP_NAME');
const rpID = requireEnv('RP_ID');
const origin = requireEnv('WEBAUTHN_ORIGIN');
const challengesStore = {};
const COOKIE_NAME = requireEnv('COOKIE_NAME');

function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = authService.verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      full_name: payload.full_name,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName, agreedToTerms } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ error: 'Email, password and full name are required' });
    if (!agreedToTerms) return res.status(400).json({ error: 'Terms agreement is required' });

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
 
    await authService.createUser({ id, email, passwordHash, fullName, agreedToTerms });

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await authService.findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'Неверный email или пароль' });

    const validPassword = await authService.verifyPassword(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Неверный email или пароль' });

    if (user.role === 'pending') return res.status(403).json({ error: 'Аккаунт ожидает проверки администратора' });

    const accessToken = authService.createToken(user);
    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name }, token: accessToken });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.get('/biometrics', async (req, res, next) => {
  try {
    const email = req.query.email || req.query.user_email;
    if (!email) return res.status(400).json({ error: 'Email query param is required' });

    const result = await query('SELECT * FROM user_authenticators WHERE lower(user_email) = lower($1)', [email]);
    res.json({ authenticators: result.rows });
  } catch (error) {
    next(error);
  }
});

router.delete('/biometrics', async (req, res, next) => {
  try {
    const email = req.query.email || req.query.user_email;
    const credentialId = req.query.credential_id;
    if (!email && !credentialId) return res.status(400).json({ error: 'Email or credential_id query param is required' });

    const condition = email ? 'lower(user_email) = lower($1)' : 'credential_id = $1';
    const value = email || credentialId;
    await query(`DELETE FROM user_authenticators WHERE ${condition}`, [value]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/webauthn/register/generate', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await authService.findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existingAuthenticators = await authService.findAuthenticators(email);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id, 'utf8')),
      userName: email,
      attestationType: 'none',
      excludeCredentials: existingAuthenticators.map(auth => ({
        id: auth.credential_id,
        type: 'public-key',
      })),
      authenticatorSelection: { residentKey: 'discouraged', userVerification: 'discouraged' },
    });

    challengesStore[email] = options.challenge;
    res.json(options);
  } catch (error) {
    next(error);
  }
});

router.post('/webauthn/register/verify', async (req, res) => {
  try {
    const { email, body } = req.body;
    if (!email || !body) return res.status(400).json({ error: 'Email and response body are required' });

    const expectedChallenge = challengesStore[email];
    if (!expectedChallenge) return res.status(400).json({ error: 'No registration challenge found' });

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      await query(
        `INSERT INTO user_authenticators (user_email, credential_id, credential_public_key, counter)
         VALUES ($1, $2, $3, $4)`,
        [email, credential.id, Buffer.from(credential.publicKey).toString('base64url'), credential.counter]
      );
      delete challengesStore[email];
      return res.json({ verified: true });
    }

    res.status(400).json({ error: 'Verification failed' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Verification failed' });
  }
});

router.post('/webauthn/login/generate', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const authenticators = await authService.findAuthenticators(email);
    if (!authenticators || authenticators.length === 0) return res.status(404).json({ error: 'No biometric device found for this email' });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: authenticators.map(auth => ({
        id: auth.credential_id,
        type: 'public-key',
      })),
      userVerification: 'discouraged',
    });

    challengesStore[email] = options.challenge;
    res.json(options);
  } catch (error) {
    next(error);
  }
});

router.post('/webauthn/login/verify', async (req, res) => {
  try {
    const { email, body } = req.body;
    if (!email || !body) return res.status(400).json({ error: 'Email and response body are required' });

    const expectedChallenge = challengesStore[email];
    if (!expectedChallenge) return res.status(400).json({ error: 'No authentication challenge found' });

    const authenticator = await authService.findAuthenticatorById(body.id);
    if (!authenticator) return res.status(400).json({ error: 'Authenticator not found' });

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credential_id,
        publicKey: new Uint8Array(Buffer.from(authenticator.credential_public_key, 'base64url')),
        counter: authenticator.counter,
      },
      requireUserVerification: false,
    });

    if (verification.verified) {
      await query(
        `UPDATE user_authenticators SET counter = $1 WHERE credential_id = $2`,
        [verification.authenticationInfo.newCounter, authenticator.credential_id]
      );
      const user = await authService.findUserByEmail(email);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const accessToken = authService.createToken(user);
      res.cookie(COOKIE_NAME, accessToken, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
      });
      delete challengesStore[email];
      return res.json({
        verified: true,
        user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
        token: accessToken,
        redirectTo: user.role === 'admin' ? '/admin' : user.role === 'manager' ? '/manager' : '/operator',
      });
    }

    res.status(400).json({ error: 'Verification failed' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Verification failed' });
  }
});

module.exports = router;