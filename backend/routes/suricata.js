const express = require('express');
const { query } = require('../db');
const { syncSuricataRules } = require('../services/suricataService');
const { broadcast } = require('../sse');
const ApiError = require('../utils/ApiError');
const router = express.Router();

router.get('/rules', async (req, res, next) => {
  // #swagger.tags = ['Suricata']
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
    const result = await query('SELECT * FROM suricata_rules ORDER BY sid ASC');
    res.json({ rules: result.rows });
  } catch (error) { next(error); }
});

router.post('/rules', async (req, res, next) => {
  // #swagger.tags = ['Suricata']
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
    let { action, protocol, src_ip, src_port, dst_ip, dst_port, msg, sid } = req.body;
    if (!action || !protocol || !src_ip || !src_port || !dst_ip || !dst_port || !msg) {
      throw ApiError.BadRequest('All rule fields except sid are required');
    }
    if (!sid) {
      const maxSidResult = await query('SELECT MAX(sid) as max_sid FROM suricata_rules');
      sid = maxSidResult.rows[0].max_sid ? Number(maxSidResult.rows[0].max_sid) + 1 : 1000001;
    }
    const result = await query(
      `INSERT INTO suricata_rules (action, protocol, src_ip, src_port, dst_ip, dst_port, msg, sid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [action, protocol, src_ip, src_port, dst_ip, dst_port, msg, Number(sid)]
    );
    await syncSuricataRules();
    broadcast('rule_change', result.rows[0]);
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

router.put('/rules/:id', async (req, res, next) => {
  // #swagger.tags = ['Suricata']
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
    const { id } = req.params;
    const { action, protocol, src_ip, src_port, dst_ip, dst_port, msg, sid, is_deleted } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (action !== undefined) { updates.push(`action = $${idx++}`); values.push(action); }
    if (protocol !== undefined) { updates.push(`protocol = $${idx++}`); values.push(protocol); }
    if (src_ip !== undefined) { updates.push(`src_ip = $${idx++}`); values.push(src_ip); }
    if (src_port !== undefined) { updates.push(`src_port = $${idx++}`); values.push(src_port); }
    if (dst_ip !== undefined) { updates.push(`dst_ip = $${idx++}`); values.push(dst_ip); }
    if (dst_port !== undefined) { updates.push(`dst_port = $${idx++}`); values.push(dst_port); }
    if (msg !== undefined) { updates.push(`msg = $${idx++}`); values.push(msg); }
    if (sid !== undefined) { updates.push(`sid = $${idx++}`); values.push(Number(sid)); }
    if (is_deleted !== undefined) { updates.push(`is_deleted = $${idx++}`); values.push(is_deleted); }

    if (!updates.length) throw ApiError.BadRequest('Update fields required');
    const result = await query(`UPDATE suricata_rules SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, [...values, id]);
    if (!result.rows.length) throw ApiError.NotFound('Rule not found');
    
    await syncSuricataRules();
    broadcast('rule_change', result.rows[0]);
    res.json({ rule: result.rows[0] });
  } catch (error) { next(error); }
});

router.get('/incidents', async (req, res, next) => {
  // #swagger.tags = ['Suricata']
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
    const source = req.query.source;
    const text = source ? 'SELECT * FROM incidents WHERE source = $1 ORDER BY created_at DESC' : 'SELECT * FROM incidents ORDER BY created_at DESC';
    const result = source ? await query(text, [source]) : await query(text, []);
    res.json({ incidents: result.rows });
  } catch (error) { next(error); }
});

router.put('/incidents/:id', async (req, res, next) => {
  // #swagger.tags = ['Suricata']
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
    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw ApiError.BadRequest('Status is required');
    const result = await query('UPDATE incidents SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (!result.rows.length) throw ApiError.NotFound('Incident not found');
    broadcast('incident', result.rows[0]);
    res.json({ incident: result.rows[0] });
  } catch (error) { next(error); }
});

router.get('/audit-logs', async (req, res, next) => {
  // #swagger.tags = ['Suricata']
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
    const result = await query(`SELECT a.*, p.email as user_email FROM audit_logs a LEFT JOIN profiles p ON a.user_id = p.id ORDER BY a.created_at DESC`);
    res.json({ logs: result.rows });
  } catch (error) { next(error); }
});

router.post('/audit-logs', async (req, res, next) => {
  // #swagger.tags = ['Suricata']
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
    const { user_id, action, details } = req.body;
    if (!action) throw ApiError.BadRequest('Action is required');
    const result = await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3) RETURNING *`, [user_id || null, action, details || {}]);
    let userEmail = null;
    if (user_id) {
       const userRes = await query(`SELECT email FROM profiles WHERE id = $1`, [user_id]);
       if (userRes.rows.length) userEmail = userRes.rows[0].email;
    }
    const log = result.rows[0];
    log.user_email = userEmail;
    broadcast('audit_log', log);
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

module.exports = router;