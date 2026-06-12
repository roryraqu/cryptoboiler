const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');
const { broadcast } = require('../sse');
const ApiError = require('../utils/ApiError');

const router = express.Router();

router.get('/', async (req, res, next) => {
  // #swagger.tags = ['Telemetry']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
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
  // #swagger.tags = ['Telemetry']
  // #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
  // #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
  // #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
  // #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' } 
  // #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
  // #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  // #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
  try {
    const { boiler_id, temperature, pressure, timestamp, hmac_signature } = req.body;
    if (!boiler_id || temperature == null || pressure == null || !timestamp || !hmac_signature) {
      throw ApiError.BadRequest('Missing required fields');
    }

    const boilerResult = await query('SELECT hmac_secret FROM boilers WHERE id = $1 AND is_deleted = false', [boiler_id]);
    if (!boilerResult.rows.length) throw ApiError.NotFound('Boiler not found');

    const secret = boilerResult.rows[0].hmac_secret;
    const payloadStr = `${boiler_id}|${Number(temperature).toFixed(2)}|${Number(pressure).toFixed(2)}|${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
    const isHmacValid = expectedSignature === hmac_signature;

    const telemetryData = {
      boiler_id,
      temperature: Number(temperature),
      pressure: Number(pressure),
      timestamp: new Date(timestamp).toISOString(),
      hmac_signature,
      is_hmac_valid: isHmacValid
    };

    broadcast('telemetry', telemetryData);

    if (!isHmacValid) {
      const incData = {
        source: 'hmac_mismatch',
        boiler_id,
        severity: 'critical',
        description: `HMAC validation failed for boiler ${boiler_id}`,
        status: 'open',
        created_at: new Date().toISOString()
      };
      broadcast('incident', incData);
    }

    query(
      `INSERT INTO telemetry (boiler_id, temperature, pressure, timestamp, hmac_signature, is_hmac_valid)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [boiler_id, Number(temperature), Number(pressure), new Date(timestamp), hmac_signature, isHmacValid]
    ).catch(() => {});

    if (!isHmacValid) {
      query(
        `INSERT INTO incidents (source, boiler_id, severity, description, status) VALUES ($1, $2, $3, $4, 'open')`,
        ['hmac_mismatch', boiler_id, 'critical', `HMAC validation failed for boiler ${boiler_id}`]
      ).catch(() => {});
    }

    res.json({ success: true, valid: isHmacValid });
  } catch (error) {
    next(error);
  }
});

module.exports = router;