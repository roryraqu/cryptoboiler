const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const jwtSecret = requireEnv('JWT_SECRET');

async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, email, password_hash, role, full_name
     FROM profiles
     WHERE lower(email) = lower($1) AND is_deleted = false`,
    [email]
  );
  return result.rows[0];
}

async function findAuthenticators(email) {
  const result = await query(
    `SELECT * FROM user_authenticators WHERE lower(user_email) = lower($1)`,
    [email]
  );
  return result.rows;
}

async function findAuthenticatorById(credentialId) {
  const result = await query(
    `SELECT * FROM user_authenticators WHERE credential_id = $1`,
    [credentialId]
  );
  return result.rows[0];
}

async function createUser({ id, email, passwordHash, fullName, agreedToTerms }) {
  await query(
    `INSERT INTO profiles (id, email, password_hash, full_name, role, terms_accepted) VALUES ($1, $2, $3, $4, 'pending', $5)`,
    [id, email, passwordHash, fullName, agreedToTerms]
  );
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
    jwtSecret,
    { expiresIn: '8h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = {
  findUserByEmail,
  findAuthenticators,
  findAuthenticatorById,
  createUser,
  verifyPassword,
  createToken,
  verifyToken,
};