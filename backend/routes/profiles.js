const express = require('express');
const { query } = require('../db');
const { broadcast } = require('../sse');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { id } = req.query;
    let sql = 'SELECT id, email, full_name, role, is_deleted FROM profiles';
    const params = [];
    if (id) { sql += ' WHERE id = $1'; params.push(id); }
    const result = await query(sql, params);
    res.json({ profiles: result.rows });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_deleted } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
    if (email !== undefined) { updates.push(`email = $${idx++}`); values.push(email); }
    if (role !== undefined) { updates.push(`role = $${idx++}`); values.push(role); }
    if (is_deleted !== undefined) { updates.push(`is_deleted = $${idx++}`); values.push(is_deleted); }

    if (!updates.length) return res.status(400).json({ error: 'Update fields required' });
    const result = await query(`UPDATE profiles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, role, is_deleted`, [...values, id]);
    
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    broadcast('profile_change', result.rows[0]);
    res.json({ profiles: [result.rows[0]] });
  } catch (error) { next(error); }
});

module.exports = router;