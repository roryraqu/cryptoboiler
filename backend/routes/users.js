const express = require('express');
const { query } = require('../db');
const ApiError = require('../utils/ApiError');

const router = express.Router();

/**
 * @swagger
 * /api/users:
 * get:
 * tags: [Users]
 * responses:
 * 200:
 * description: Успешное выполнение
 * 400:
 * $ref: '#/components/responses/BadRequest'
 * 404:
 * $ref: '#/components/responses/NotFound'
 * 500:
 * $ref: '#/components/responses/InternalServerError'
 */
router.get('/', async (req, res, next) => {
  try {
    const { id } = req.query;
    let sql = 'SELECT id, email, full_name, role, is_deleted FROM users';
    const params = [];

    if (id) {
      sql += ' WHERE id = $1';
      params.push(id);
    }

    const result = await query(sql, params);
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 * put:
 * tags: [Users]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * $ref: '#/components/responses/SuccessOK'
 * 400:
 * $ref: '#/components/responses/BadRequest'
 * 404:
 * $ref: '#/components/responses/NotFound'
 * 500:
 * $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_deleted } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${idx++}`);
      values.push(full_name);
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (is_deleted !== undefined) {
      updates.push(`is_deleted = $${idx++}`);
      values.push(is_deleted);
    }

    if (!updates.length) {
      throw ApiError.BadRequest('At least one field is required to update');
    }

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, role, is_deleted`,
      [...values, id]
    );

    if (!result.rows.length) {
      throw ApiError.NotFound('User not found');
    }

    res.json({ users: [result.rows[0]] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;