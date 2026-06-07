const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');

// Get all inventory
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name');
    res.json({ success: true, inventory: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get items low in stock
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE stock_qty <= low_stock_threshold');
    res.json({ success: true, items: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add inventory item (Admin/Manager only)
router.post('/', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { name, type, price, stock_qty, low_stock_threshold } = req.body;
  if (!name || !type || price === undefined || stock_qty === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO inventory (name, type, price, stock_qty, low_stock_threshold) VALUES (?, ?, ?, ?, ?)',
      [name, type, price, stock_qty, low_stock_threshold || 10]
    );

    await logAudit(req.user.id, 'Inventory Add', `Added item ${name} ($${price}, Qty: ${stock_qty})`);
    res.json({ success: true, message: 'Inventory item added successfully', itemId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: duplicate item name' });
  }
});

// Update stock quantity / details
router.put('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  const { name, type, price, stock_qty, low_stock_threshold } = req.body;

  try {
    await pool.query(
      'UPDATE inventory SET name = ?, type = ?, price = ?, stock_qty = ?, low_stock_threshold = ? WHERE id = ?',
      [name, type, price, stock_qty, low_stock_threshold, id]
    );

    await logAudit(req.user.id, 'Inventory Edit', `Updated item ID: ${id} to ${name} ($${price}, Qty: ${stock_qty})`);
    res.json({ success: true, message: 'Inventory item updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Quick stock adjust (Attendant role can use this to add/adjust counts)
router.patch('/:id/adjust-stock', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { adjustment } = req.body; // e.g. +10 or -5

  if (adjustment === undefined || isNaN(adjustment)) {
    return res.status(400).json({ success: false, message: 'Valid adjustment number required' });
  }

  try {
    const [rows] = await pool.query('SELECT name, stock_qty FROM inventory WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = rows[0];
    const newQty = item.stock_qty + parseInt(adjustment);
    if (newQty < 0) {
      return res.status(400).json({ success: false, message: 'Stock quantity cannot fall below 0' });
    }

    await pool.query('UPDATE inventory SET stock_qty = ? WHERE id = ?', [newQty, id]);
    await logAudit(req.user.id, 'Stock Adjust', `Adjusted stock for ${item.name} by ${adjustment} (New stock: ${newQty})`);

    res.json({ success: true, message: 'Stock updated successfully', newQty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete inventory item (Admin/Manager only)
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT name FROM inventory WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
    await logAudit(req.user.id, 'Inventory Delete', `Deleted item ${rows[0].name} (ID: ${id})`);

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: Item may be referenced in sales logs' });
  }
});

module.exports = router;
