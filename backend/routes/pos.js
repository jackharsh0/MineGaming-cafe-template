const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit, getSystemSetting } = require('../utils/helper');
const { broadcast } = require('./realtime');
const { validateBody, z } = require('../middleware/validate');

const posCheckoutSchema = z.object({
  sessionId: z.number().int().nullable().optional(),
  playerId: z.number().int().nullable().optional(),
  saleType: z.enum(['Direct', 'SessionBill']),
  items: z.array(z.object({
    itemId: z.number().int(),
    quantity: z.number().int().positive('Quantity must be greater than zero')
  })).min(1, 'No items in the order'),
  paymentMethod: z.enum(['Cash', 'PlayHours', 'Card', 'Split']).optional().default('Cash'),
  couponCode: z.string().trim().nullable().optional(),
  paymentIntentId: z.string().trim().nullable().optional(),
  transactionId: z.string().trim().nullable().optional()
});

// Get items ordered for a session
router.get('/session/:sessionId', verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT psi.*, IFNULL(i.name, 'Terminal Session Charge') AS item_name, IFNULL(i.type, 'Terminal') AS item_type,
              gs.start_time AS terminal_start_time, gs.end_time AS terminal_end_time,
              gs.target_end_time AS terminal_target_end_time, gs.hourly_rate AS terminal_hourly_rate,
              gs.station_id AS terminal_station_id, gs.payment_method AS terminal_payment_method,
              st.name AS terminal_station_name
       FROM pos_sale_items psi
       JOIN pos_sales ps ON psi.sale_id = ps.id
       LEFT JOIN inventory i ON psi.item_id = i.id
       LEFT JOIN game_sessions gs ON ps.merged_from_session_id = gs.id
       LEFT JOIN stations st ON gs.station_id = st.id
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
router.post('/checkout', verifyToken, validateBody(posCheckoutSchema), async (req, res) => {
  const { sessionId, playerId, saleType, items, paymentMethod, couponCode, paymentIntentId, transactionId } = req.body;

  // Idempotency check:
  if (transactionId) {
    try {
      const [existingSale] = await pool.query(
        'SELECT id FROM pos_sales WHERE transaction_id = ?',
        [transactionId]
      );
      if (existingSale.length > 0) {
        return res.json({
          success: true,
          saleId: existingSale[0].id,
          message: 'POS sale already processed (idempotent)'
        });
      }
    } catch (dbErr) {
      console.error('Idempotency check failed:', dbErr);
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0.00;
    const saleItemsToInsert = [];

    // Verify inventory and calculate costs
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
        name: invItem.name,
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

    let hoursToDeduct = 0.00;
    // PlayHours transaction check for direct play hours purchases
    if (saleType === 'Direct' && paymentMethod === 'PlayHours' && playerId) {
      const [players] = await conn.query(
        'SELECT name, play_hours FROM players WHERE id = ? FOR UPDATE',
        [playerId]
      );
      if (players.length === 0) {
        throw new Error('Player not found');
      }
      const player = players[0];
      hoursToDeduct = parseFloat((total / 5.00).toFixed(2));
      if (parseFloat(player.play_hours) < hoursToDeduct) {
        throw new Error(`Insufficient play hours. Available: ${player.play_hours} Hours, Needed: ${hoursToDeduct} Hours`);
      }
      
      // Deduct from play hours
      await conn.query(
        'UPDATE players SET play_hours = play_hours - ? WHERE id = ?',
        [hoursToDeduct, playerId]
      );
    }

    // Insert sale record
    const [saleResult] = await conn.query(
      `INSERT INTO pos_sales 
       (session_id, player_id, sale_type, subtotal, tax, discount, total, payment_method, play_hours_amount, status, created_by, payment_intent_id, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleType === 'SessionBill' ? sessionId : null,
        playerId || null,
        saleType,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod || 'Cash',
        hoursToDeduct,
        status,
        req.user.id,
        paymentIntentId || null,
        transactionId || null
      ]
    );

    const saleId = saleResult.insertId;

    // Insert sale items
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
      auditMsg = `Added Cafe items to Session ID: ${sessionId} (Subtotal: ₹${subtotal.toFixed(2)})`;
    } else {
      auditMsg = `Completed direct POS sale ID: ${saleId} (Total: ₹${total.toFixed(2)}) via ${paymentMethod}`;

      // Send WhatsApp receipt for Direct sales asynchronously
      if (playerId) {
        try {
          const [settingsRows] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'whatsapp_enabled'");
          const whatsappEnabled = settingsRows.length > 0 ? settingsRows[0].setting_value === '1' : false;
          if (whatsappEnabled) {
            const [playerRows] = await pool.query("SELECT name, phone FROM players WHERE id = ?", [playerId]);
            if (playerRows.length > 0 && playerRows[0].phone && playerRows[0].phone.trim()) {
              const player = playerRows[0];
              const invoiceItems = saleItemsToInsert.map(item => ({
                name: item.name,
                quantity: item.quantity,
                totalPrice: item.totalPrice
              }));
              
              const { sendWhatsAppInvoice } = require('../utils/whatsapp');
              sendWhatsAppInvoice(player.phone.trim(), {
                receiptId: `POS-${saleId}`,
                customerName: player.name,
                subtotal,
                discount,
                tax,
                taxRate: taxPercent,
                total,
                items: invoiceItems
              }).catch(e => {
                console.error('[WhatsApp Bill Error] Failed to send Cafe POS receipt:', e.message);
              });
            }
          }
        } catch (wsErr) {
          console.error('[WhatsApp Bill Error] Cafe POS checkout settings/player query failed:', wsErr.message);
        }
      }
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
    res.status(400).json({ success: false, message: 'Server error during POS processing' });
  } finally {
    conn.release();
  }
});

// Public Quick Order (No auth required)
router.post('/quick-order', async (req, res) => {
  const { location, items } = req.body;
  if (!location || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Location and items are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const itemsSummaryList = [];

    for (const item of items) {
      // Find matching item in inventory by keyword
      let keyword = item.name;
      if (keyword.toLowerCase().includes('monster')) keyword = 'Monster';
      else if (keyword.toLowerCase().includes('red bull')) keyword = 'Red Bull';
      else if (keyword.toLowerCase().includes('ramyun') || keyword.toLowerCase().includes('shin')) keyword = 'Shin Ramyun';
      else if (keyword.toLowerCase().includes('chips') || keyword.toLowerCase().includes('lays')) keyword = 'Chips';
      else if (keyword.toLowerCase().includes('coffee')) keyword = 'Coffee';
      else if (keyword.toLowerCase().includes('chocolate') || keyword.toLowerCase().includes('bar')) keyword = 'Chocolate';

      const [inv] = await conn.query(
        'SELECT id, name, stock_qty, price FROM inventory WHERE name LIKE ? FOR UPDATE',
        [`%${keyword}%`]
      );

      if (inv.length > 0) {
        const invItem = inv[0];
        const qtyToDeduct = Math.min(invItem.stock_qty, item.qty);
        if (qtyToDeduct > 0) {
          await conn.query('UPDATE inventory SET stock_qty = stock_qty - ? WHERE id = ?', [qtyToDeduct, invItem.id]);
          itemsSummaryList.push(`${item.qty}x ${invItem.name}`);
        } else {
          itemsSummaryList.push(`${item.qty}x ${item.name} (Out of Stock)`);
        }
      } else {
        itemsSummaryList.push(`${item.qty}x ${item.name}`);
      }
    }

    await conn.commit();

    const itemsSummary = itemsSummaryList.join(', ');

    // Broadcast to Operator Dashboard via SSE
    broadcast('new_quick_order', {
      location,
      itemsSummary,
      timestamp: new Date().toISOString()
    });

    // Also add to audit logs under admin user (ID: 1)
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
      [1, 'Quick Cafe Order', `Quick Order from ${location}: ${itemsSummary}`]
    );

    res.json({ success: true, message: 'Order submitted to counter staff!' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process quick order' });
  } finally {
    conn.release();
  }
});

// Delete a POS sale item and refund stock
router.delete('/sale-item/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Sale item details
    const [items] = await conn.query(
      'SELECT psi.*, ps.id AS sale_id, ps.status AS sale_status FROM pos_sale_items psi JOIN pos_sales ps ON psi.sale_id = ps.id WHERE psi.id = ? FOR UPDATE',
      [id]
    );

    if (items.length === 0) {
      throw new Error('Sale item not found');
    }

    const item = items[0];
    if (item.sale_status !== 'Pending') {
      throw new Error('Cannot modify a completed or paid order');
    }

    // Refund inventory (skip placeholder item 999)
    if (item.item_id !== 999) {
      await conn.query(
        'UPDATE inventory SET stock_qty = stock_qty + ? WHERE id = ?',
        [item.quantity, item.item_id]
      );
    }

    // Delete sale item
    await conn.query('DELETE FROM pos_sale_items WHERE id = ?', [id]);

    // Update sale totals
    const [remaining] = await conn.query(
      'SELECT SUM(total_price) AS subtotal FROM pos_sale_items WHERE sale_id = ?',
      [item.sale_id]
    );

    const subtotal = parseFloat(remaining[0].subtotal || 0);

    if (subtotal === 0) {
      // If no items left, delete the sale itself
      await conn.query('DELETE FROM pos_sales WHERE id = ?', [item.sale_id]);
    } else {
      const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
      const tax = parseFloat((subtotal * (taxPercent / 100)).toFixed(2));
      const total = parseFloat((subtotal + tax).toFixed(2));

      await conn.query(
        'UPDATE pos_sales SET subtotal = ?, tax = ?, total = ? WHERE id = ?',
        [subtotal, tax, total, item.sale_id]
      );
    }

    await conn.commit();

    await logAudit(
      req.user.id,
      'POS Sale Item Delete',
      `Deleted sale item ID: ${id} from POS Sale ID: ${item.sale_id} (Refunded stock of item ID: ${item.item_id})`
    );

    res.json({ success: true, message: 'Item removed and stock refunded' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ success: false, message: 'Failed to delete sale item' });
  } finally {
    conn.release();
  }
});

module.exports = router;
