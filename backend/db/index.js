const { Pool } = require('pg');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: requireEnv('PGHOST'),
      port: Number(requireEnv('PGPORT')),
      user: requireEnv('PGUSER'),
      password: requireEnv('PGPASSWORD'),
      database: requireEnv('PGDATABASE'),
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected Postgres error', err);
  process.exit(-1);
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

module.exports = {
  query,
  pool,
};