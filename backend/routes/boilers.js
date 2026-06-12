const express = require('express');
const { query } = require('../db');
const { broadcast } = require('../sse');

const router = express.Router();

const lastStatuses = {};
setInterval(async () => {
  try {
    const result = await query('SELECT id, ip_address, port FROM boilers WHERE is_deleted = false');
    for (const b of result.rows) {
      let currentStatus = 'offline';
      if (b.ip_address && b.port && b.ip_address !== 'any') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(`http://${b.ip_address}:${b.port}/status`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            currentStatus = data.status || 'offline';
          }
        } catch (error) {
          console.error('Таймаут при опросе котла:', error.message);
        }
      }
      
      if (lastStatuses[b.id] !== currentStatus) {
        lastStatuses[b.id] = currentStatus;
        broadcast('status', { id: b.id, status: currentStatus });
      }
    }
  } catch (e) {
    console.error('Ошибка при поллинге статусов:', e);
  }
}, 3000);

router.get('/', async (req, res, next) => {
  try {
    const { id, is_deleted } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (id) { conditions.push(`id = $${idx++}`); params.push(id); }
    if (is_deleted !== undefined) { conditions.push(`is_deleted = $${idx++}`); params.push(is_deleted === 'true'); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT * FROM boilers ${whereClause} ORDER BY name ASC`, params);
    res.json({ boilers: result.rows });
  } catch (error) { next(error); }
});

router.get('/statuses/all', (req, res) => {
  res.json({ statuses: lastStatuses });
});

router.post('/', async (req, res, next) => {
  try {
    const { id, name, hmac_secret, ip_address, port } = req.body;
    const result = await query(
      `INSERT INTO boilers (id, name, hmac_secret, ip_address, port) VALUES ($1, $2, $3, $4, $5) RETURNING *`, 
      [id, name, hmac_secret, ip_address, Number(port)]
    );
    
    broadcast('boiler_change', result.rows[0]);
    res.status(201).json({ success: true, boiler: result.rows[0] });
  } catch (error) { next(error); }
});

router.post('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await query('SELECT ip_address, port FROM boilers WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Котел не найден' });
    
    const { ip_address, port } = result.rows[0];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(`http://${ip_address}:${port}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Некорректный ответ от устройства');
      
      lastStatuses[id] = status;
      broadcast('status', { id, status });
      res.json({ success: true, status });
    } catch {
      clearTimeout(timeoutId);
      res.status(502).json({ error: 'Котел недоступен' });
    }
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, hmac_secret, ip_address, port, is_deleted } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (hmac_secret !== undefined) { updates.push(`hmac_secret = $${idx++}`); values.push(hmac_secret); }
    if (ip_address !== undefined) { updates.push(`ip_address = $${idx++}`); values.push(ip_address); }
    if (port !== undefined) { updates.push(`port = $${idx++}`); values.push(Number(port)); }
    if (is_deleted !== undefined) { updates.push(`is_deleted = $${idx++}`); values.push(is_deleted); }

    const result = await query(`UPDATE boilers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, [...values, id]);
    
    if (result.rows.length) {
      broadcast('boiler_change', result.rows[0]);
    }
    
    res.json({ boiler: result.rows[0] });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('UPDATE boilers SET is_deleted = true WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length) {
      broadcast('boiler_change', result.rows[0]);
    }
    res.json({ success: true });
  } catch (error) { next(error); }
});

module.exports = router;