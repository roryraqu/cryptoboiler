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
const ApiError = require('../utils/ApiError');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw ApiError.Internal(`Missing required environment variable: ${name}`);
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
  if (!token) throw ApiError.Unauthorized('Unauthorized');

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
    throw ApiError.Unauthorized('Token verification failed');
  }
}

router.post('/register', async (req, res, next) => {
  // #swagger.tags = ['Auth']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const { email, password, fullName, agreedToTerms } = req.body;
    if (!email || !password || !fullName) throw ApiError.BadRequest('Email, password and full name are required');
    if (!agreedToTerms) throw ApiError.BadRequest('Terms agreement is required');

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) throw ApiError.BadRequest('User with this email already exists');

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
 
    await authService.createUser({ id, email, passwordHash, fullName, agreedToTerms });

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  // #swagger.tags = ['Auth']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const { email, password } = req.body;
    if (!email || !password) throw ApiError.BadRequest('Email and password are required');

    const user = await authService.findUserByEmail(email);
    if (!user) throw ApiError.BadRequest('Неверный email или пароль');

    const validPassword = await authService.verifyPassword(password, user.password_hash);
    if (!validPassword) throw ApiError.BadRequest('Неверный email или пароль');

    if (user.role === 'pending') throw ApiError.Forbidden('Аккаунт ожидает проверки администратора');

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
  // #swagger.tags = ['Auth']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  res.json({ user: req.user });
});

router.get('/biometrics', async (req, res, next) => {
  // #swagger.tags = ['Auth']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const email = req.query.email || req.query.user_email;
    if (!email) throw ApiError.BadRequest('Email query param is required');

    const result = await query('SELECT * FROM user_authenticators WHERE lower(user_email) = lower($1)', [email]);
    res.json({ authenticators: result.rows });
  } catch (error) {
    next(error);
  }
});

router.delete('/biometrics', async (req, res, next) => {
  // #swagger.tags = ['Auth']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const email = req.query.email || req.query.user_email;
    const credentialId = req.query.credential_id;
    if (!email && !credentialId) throw ApiError.BadRequest('Email or credential_id query param is required');

    const condition = email ? 'lower(user_email) = lower($1)' : 'credential_id = $1';
    const value = email || credentialId;
    await query(`DELETE FROM user_authenticators WHERE ${condition}`, [value]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/webauthn/register/generate', async (req, res, next) => {
  // #swagger.tags = ['Auth WebAuthn']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const { email } = req.body;
    if (!email) throw ApiError.BadRequest('Email required');

    const user = await authService.findUserByEmail(email);
    if (!user) throw ApiError.NotFound('User not found');

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

router.post('/webauthn/register/verify', async (req, res, next) => {
  // #swagger.tags = ['Auth WebAuthn']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const { email, body } = req.body;
    if (!email || !body) throw ApiError.BadRequest('Email and response body are required');

    const expectedChallenge = challengesStore[email];
    if (!expectedChallenge) throw ApiError.BadRequest('No registration challenge found');

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

    throw ApiError.BadRequest('Verification failed');
  } catch (error) {
    next(error);
  }
});

router.post('/webauthn/login/generate', async (req, res, next) => {
  // #swagger.tags = ['Auth WebAuthn']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const { email } = req.body;
    if (!email) throw ApiError.BadRequest('Email required');

    const authenticators = await authService.findAuthenticators(email);
    if (!authenticators || authenticators.length === 0) throw ApiError.NotFound('No biometric device found for this email');

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

router.post('/webauthn/login/verify', async (req, res, next) => {
  // #swagger.tags = ['Auth WebAuthn']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[301] = { $ref: '#/components/responses/MovedPermanently' }
  // #swagger.responses[302] = { $ref: '#/components/responses/Found' }
  // #swagger.responses[304] = { $ref: '#/components/responses/NotModified' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const { email, body } = req.body;
    if (!email || !body) throw ApiError.BadRequest('Email and response body are required');

    const expectedChallenge = challengesStore[email];
    if (!expectedChallenge) throw ApiError.BadRequest('No authentication challenge found');

    const authenticator = await authService.findAuthenticatorById(body.id);
    if (!authenticator) throw ApiError.BadRequest('Authenticator not found');

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
      if (!user) throw ApiError.NotFound('User not found');

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

    throw ApiError.BadRequest('Verification failed');
  } catch (error) {
    next(error);
  }
});

module.exports = router;