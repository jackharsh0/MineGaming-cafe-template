const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit, getSystemSetting } = require('../utils/helper');

// Get items ordered for a session
router.get('/session/:sessionId', verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT psi.*, i.name AS item_name, i.type AS item_type 
       FROM pos_sale_items psi
       JOIN pos_sales ps ON psi.sale_id = ps.id
       JOIN inventory i ON psi.item_id = i.id
       WHERE ps.session_id = ? AND ps.status = 'Pending'`,
      [sessionId]
    );
    res.json({ success: true, items: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Process POS Sale (Direct or Session-Bill)
router.post('/checkout', verifyToken, async (req, res) => {
  const { sessionId, playerId, saleType, items, paymentMethod, couponCode } = req.body;
  // items: Array of { itemId, quantity }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'No items in the order' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0.00;
    const saleItemsToInsert = [];

    // 1. Calculate item costs and verify/deduct inventory stock
    for (const item of items) {
      const [inventoryRows] = await conn.query(
        'SELECT name, price, stock_qty FROM inventory WHERE id = ? FOR UPDATE',
        [item.itemId]
      );
      if (inventoryRows.length === 0) {
        throw new Error(`Item ID ${item.itemId} not found in inventory`);
      }
      
      const invItem = inventoryRows[0];
      if (invItem.stock_qty < item.quantity) {
        throw new Error(`Insufficient stock for ${invItem.name}. Available: ${invItem.stock_qty}, Requested: ${item.quantity}`);
      }

      // Deduct stock
      await conn.query(
        'UPDATE inventory SET stock_qty = stock_qty - ? WHERE id = ?',
        [item.quantity, item.itemId]
      );

      const unitPrice = parseFloat(invItem.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      saleItemsToInsert.push({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      });
    }

    let discount = 0.00;
    // Apply coupon if direct sale
    if (saleType === 'Direct' && couponCode) {
      const [coupons] = await conn.query(
        'SELECT * FROM coupons WHERE code = ? AND active = 1',
        [couponCode]
      );
      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (subtotal >= parseFloat(coupon.min_spend)) {
          if (coupon.discount_percent) {
            discount = subtotal * (parseFloat(coupon.discount_percent) / 100);
          } else if (coupon.discount_flat) {
            discount = parseFloat(coupon.discount_flat);
          }
        }
      }
    }

    const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
    const tax = parseFloat(((subtotal - discount) * (taxPercent / 100)).toFixed(2));
    const total = parseFloat((subtotal - discount + tax).toFixed(2));

    const status = saleType === 'SessionBill' ? 'Pending' : 'Paid';

    // Wallet transaction check for direct wallet purchases
    if (saleType === 'Direct' && paymentMethod === 'Wallet' && playerId) {
      const [players] = await conn.query(
        'SELECT name, wallet_balance FROM players WHERE id = ? FOR UPDATE',
        [playerId]
      );
      if (players.length === 0) {
        throw new Error('Player not found');
      }
      const player = players[0];
      if (parseFloat(player.wallet_balance) < total) {
        throw new Error(`Insufficient wallet balance. Available: $${player.wallet_balance}, Needed: $${total}`);
      }
      
      // Deduct from wallet
      await conn.query(
        'UPDATE players SET wallet_balance = wallet_balance - ? WHERE id = ?',
        [total, playerId]
      );
    }

    // 2. Insert POS sale record
    const [saleResult] = await conn.query(
      `INSERT INTO pos_sales 
       (session_id, player_id, sale_type, subtotal, tax, discount, total, payment_method, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleType === 'SessionBill' ? sessionId : null,
        playerId || null,
        saleType,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod || 'Cash',
        status,
        req.user.id
      ]
    );

    const saleId = saleResult.insertId;

    // 3. Insert sale items
    for (const sItem of saleItemsToInsert) {
      await conn.query(
        `INSERT INTO pos_sale_items (sale_id, item_id, quantity, unit_price, total_price) 
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, sItem.itemId, sItem.quantity, sItem.unitPrice, sItem.totalPrice]
      );
    }

    await conn.commit();

    let auditMsg = '';
    if (saleType === 'SessionBill') {
      auditMsg = `Added Cafe items to Session ID: ${sessionId} (Subtotal: $${subtotal.toFixed(2)})`;
    } else {
      auditMsg = `Completed direct POS sale ID: ${saleId} (Total: $${total.toFixed(2)}) via ${paymentMethod}`;
    }
    await logAudit(req.user.id, 'POS Sale', auditMsg);

    res.json({
      success: true,
      message: saleType === 'SessionBill' ? 'Items added to active session bill' : 'Direct sale checkout completed',
      saleId,
      total
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ success: false, message: err.message || 'Server error during POS processing' });
  } finally {
    conn.release();
  }
});

module.exports = router;
