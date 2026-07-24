const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');

// GET all active categories
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY display_order');
    res.json({ success: true, categories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create category
router.post('/', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { name, icon, display_order } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name, icon, display_order) VALUES (?, ?, ?)',
      [name, icon || '📦', display_order || 0]
    );
    await logAudit(req.user.id, 'Category Add', `Added category ${name} (${icon || '📦'})`);
    res.json({ success: true, message: 'Category created successfully', categoryId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: category name may already exist' });
  }
});

// PUT reorder categories
router.put('/reorder', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { order } = req.body; // Array of { id, display_order }
  if (!order || !Array.isArray(order)) {
    return res.status(400).json({ success: false, message: 'Order array required' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of order) {
      await conn.query('UPDATE categories SET display_order = ? WHERE id = ?', [item.display_order, item.id]);
    }
    await conn.commit();
    await logAudit(req.user.id, 'Category Reorder', 'Reordered categories');
    res.json({ success: true, message: 'Categories reordered successfully' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT update category
router.put('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  const { name, icon, display_order, is_active } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }
  try {
    await pool.query(
      'UPDATE categories SET name = ?, icon = ?, display_order = ?, is_active = ? WHERE id = ?',
      [name, icon || '📦', display_order || 0, is_active === undefined ? 1 : is_active, id]
    );
    await logAudit(req.user.id, 'Category Edit', `Updated category ID: ${id} to ${name}`);
    res.json({ success: true, message: 'Category updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE category
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Reassign items of deleted category to NULL
    await conn.query('UPDATE inventory SET category_id = NULL WHERE category_id = ?', [id]);
    // Delete category
    await conn.query('DELETE FROM categories WHERE id = ?', [id]);
    await conn.commit();
    await logAudit(req.user.id, 'Category Delete', `Deleted category ID: ${id}`);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
