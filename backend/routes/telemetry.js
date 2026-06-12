const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');
const { broadcast } = require('../sse');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { boiler_id, limit } = req.query;
    let sql = 'SELECT * FROM telemetry';
    const params = [];

    if (boiler_id) {
      sql += ' WHERE boiler_id = $1';
      params.push(boiler_id);
    }

    sql += ' ORDER BY timestamp DESC';
    
    if (limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(Number(limit));
    }

    const result = await query(sql, params);
    res.json({ telemetry: result.rows.reverse() });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { boiler_id, temperature, pressure, timestamp, hmac_signature } = req.body;
    if (!boiler_id || temperature == null || pressure == null || !timestamp || !hmac_signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const boilerResult = await query('SELECT hmac_secret FROM boilers WHERE id = $1 AND is_deleted = false', [boiler_id]);
    if (!boilerResult.rows.length) return res.status(404).json({ error: 'Boiler not found' });

    const secret = boilerResult.rows[0].hmac_secret;
    const payloadStr = `${boiler_id}|${Number(temperature).toFixed(2)}|${Number(pressure).toFixed(2)}|${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
    const isHmacValid = expectedSignature === hmac_signature;

    const saved = await query(
      `INSERT INTO telemetry (boiler_id, temperature, pressure, timestamp, hmac_signature, is_hmac_valid)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [boiler_id, Number(temperature), Number(pressure), new Date(timestamp), hmac_signature, isHmacValid]
    );

    broadcast('telemetry', saved.rows[0]);

    if (!isHmacValid) {
      const inc = await query(
        `INSERT INTO incidents (source, boiler_id, severity, description, status) VALUES ($1, $2, $3, $4, 'open') RETURNING *`,
        ['hmac_mismatch', boiler_id, 'critical', `HMAC validation failed for boiler ${boiler_id}`]
      );
      broadcast('incident', inc.rows[0]);
    }

    res.json({ success: true, valid: isHmacValid });
  } catch (error) {
    next(error);
  }
});

module.exports = router;