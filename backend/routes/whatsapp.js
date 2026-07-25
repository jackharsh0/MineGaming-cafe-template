const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');
const {
  getWhatsAppStatus,
  disconnectWhatsApp,
  sendWhatsAppMessage,
  getChats,
  getChatMessages
} = require('../utils/whatsapp');

// In-memory rate limiter cache to protect APIs from loop spam
const rateLimitCache = new Map();
const apiRateLimiter = (maxRequests, windowMs) => {
  return (req, res, next) => {
    const key = `${req.ip}-${req.originalUrl}`;
    const now = Date.now();
    if (!rateLimitCache.has(key)) {
      rateLimitCache.set(key, []);
    }
    let timestamps = rateLimitCache.get(key);
    timestamps = timestamps.filter(t => now - t < windowMs);
    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down and try again later.'
      });
    }
    timestamps.push(now);
    rateLimitCache.set(key, timestamps);
    next();
  };
};

// Get connection status (Only authenticated operators)
router.get('/status', verifyToken, (req, res) => {
  try {
    const status = getWhatsAppStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Disconnect/Logout WhatsApp (SuperAdmin or Manager)
router.post('/logout', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  try {
    await disconnectWhatsApp();
    await logAudit(req.user.id, 'WhatsApp Logout', 'Disconnected linked WhatsApp account');
    res.json({ success: true, message: 'WhatsApp disconnected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to disconnect WhatsApp' });
  }
});

// Send custom test message or predefined templates (SuperAdmin or Manager)
router.post('/send-test', verifyToken, requireRole(['SuperAdmin', 'Manager']), apiRateLimiter(10, 60000), async (req, res) => {
  const { to, type, message } = req.body;
  if (!to) {
    return res.status(400).json({ success: false, message: 'Phone number (to) is required' });
  }

  try {
    const { sendWhatsAppMessage, sendWhatsAppInvoice } = require('../utils/whatsapp');

    if (type === 'bill') {
      // Send mock PDF invoice
      const mockInvoice = {
        receiptId: 'TEST-999',
        customerName: 'Harsh Jain (Test)',
        stationName: 'Console PS5-02',
        subtotal: 150.00,
        discount: 15.00,
        tax: 24.30,
        taxRate: 18,
        total: 159.30,
        items: [
          { name: 'Game Play (PS5)', quantity: 2, totalPrice: 100.00 },
          { name: 'Coca Cola 250ml', quantity: 1, totalPrice: 30.00 },
          { name: 'Popcorn Large', quantity: 1, totalPrice: 20.00 }
        ]
      };
      await sendWhatsAppInvoice(to, mockInvoice);
      await logAudit(req.user.id, 'WhatsApp Test Send', `Queued test PDF invoice to ${to}`);
      res.json({ success: true, message: 'Test PDF invoice queued successfully!' });
    } else if (type === 'low_play_hours') {
      const alertMsg = `*⚠️ Low Play Hours Alert*\n\nDear Customer, your play hours balance is running low at *1.0 Hour*.\n\nPlease load more hours at the desk to enjoy uninterrupted gaming! 🎮`;
      await sendWhatsAppMessage(to, alertMsg);
      await logAudit(req.user.id, 'WhatsApp Test Send', `Queued test low play hours alert to ${to}`);
      res.json({ success: true, message: 'Test low play hours alert queued successfully!' });
    } else if (type === 'loyalty_tier') {
      const promoMsg = `*🎉 Tier Upgraded! 🎉*\n\nCongratulations! You have been upgraded to the *Gold Tier* at MineGaming!\n\nYou now enjoy a *15% flat discount* on all game sessions and priority booking. 🏆`;
      await sendWhatsAppMessage(to, promoMsg);
      await logAudit(req.user.id, 'WhatsApp Test Send', `Queued test loyalty tier promo to ${to}`);
      res.json({ success: true, message: 'Test loyalty tier promo queued successfully!' });
    } else {
      // Default custom message
      const textMsg = message || 'Hello from MineGaming! This is a test message to verify our WhatsApp billing integration.';
      await sendWhatsAppMessage(to, textMsg);
      await logAudit(req.user.id, 'WhatsApp Test Send', `Queued custom test text message to ${to}`);
      res.json({ success: true, message: 'Test text message queued successfully!' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to queue test message' });
  }
});

// Get WhatsApp Settings (verifyToken)
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('whatsapp_enabled', 'whatsapp_pacing_min', 'whatsapp_pacing_max')"
    );
    let enabled = false;
    let pacingMin = 7;
    let pacingMax = 15;
    rows.forEach(r => {
      if (r.setting_key === 'whatsapp_enabled') enabled = r.setting_value === '1';
      if (r.setting_key === 'whatsapp_pacing_min') pacingMin = parseInt(r.setting_value) || 7;
      if (r.setting_key === 'whatsapp_pacing_max') pacingMax = parseInt(r.setting_value) || 15;
    });
    res.json({ success: true, enabled, pacingMin, pacingMax });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update WhatsApp Settings (SuperAdmin or Manager)
router.post('/settings', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { enabled, pacingMin, pacingMax } = req.body;
  const { setQueuePacing } = require('../utils/whatsapp');

  try {
    if (enabled !== undefined) {
      const enabledVal = enabled ? '1' : '0';
      await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['whatsapp_enabled', enabledVal, enabledVal]
      );
      await logAudit(req.user.id, 'WhatsApp Settings Edit', `Updated automatic billing setting to ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    if (pacingMin !== undefined && pacingMax !== undefined) {
      await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['whatsapp_pacing_min', String(pacingMin), String(pacingMin)]
      );
      await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['whatsapp_pacing_max', String(pacingMax), String(pacingMax)]
      );
      setQueuePacing(pacingMin, pacingMax);
      await logAudit(req.user.id, 'WhatsApp Pacing Edit', `Updated queue pacing range: ${pacingMin}s - ${pacingMax}s`);
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get recent queue logs (Only authenticated operators)
router.get('/queue', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, to_phone, message_type, caption, status, attempts, error_message, created_at, processed_at FROM whatsapp_queue ORDER BY id DESC LIMIT 15"
    );
    res.json({ success: true, queue: rows });
  } catch (err) {
    console.error('[WhatsApp Queue Fetch Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch queue logs' });
  }
});

// Get list of active chats (Only authenticated operators)
router.get('/chats', verifyToken, async (req, res) => {
  try {
    const chats = await getChats();
    res.json({ success: true, chats });
  } catch (err) {
    console.error('[WhatsApp Chat List Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
});

// Get messages for a specific chat (Only authenticated operators)
router.get('/chats/:jid/messages', verifyToken, async (req, res) => {
  try {
    const { jid } = req.params;
    const messages = await getChatMessages(jid, 50);
    res.json({ success: true, messages });
  } catch (err) {
    console.error('[WhatsApp Messages Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Send message/template in active chat (SuperAdmin or Manager)
router.post('/chats/:jid/send', verifyToken, requireRole(['SuperAdmin', 'Manager']), apiRateLimiter(30, 60000), async (req, res) => {
  const { jid } = req.params;
  const { type, message } = req.body;

  try {
    const { sendWhatsAppInvoice, queueWhatsAppMessage } = require('../utils/whatsapp');

    if (type === 'bill') {
      const mockInvoice = {
        receiptId: `CHAT-${Math.floor(100 + Math.random() * 900)}`,
        customerName: jid.split('@')[0],
        stationName: 'Dining Table 01',
        subtotal: 120.00,
        discount: 0.00,
        tax: 21.60,
        taxRate: 18,
        total: 141.60,
        items: [
          { name: 'Cold Coffee', quantity: 1, totalPrice: 70.00 },
          { name: 'Sandwich Double Cheese', quantity: 1, totalPrice: 50.00 }
        ]
      };
      await sendWhatsAppInvoice(jid, mockInvoice);
      await logAudit(req.user.id, 'WhatsApp Send Chat', `Queued mock bill invoice to ${jid}`);
      res.json({ success: true, message: 'Vintage invoice queued successfully' });
    } else if (type === 'low_play_hours') {
      const alertMsg = `*⚠️ Low Play Hours Alert*\n\nDear Customer, your play hours balance is running low at *1.0 Hour*.\n\nPlease load more hours at the desk to enjoy uninterrupted gaming! 🎮`;
      await queueWhatsAppMessage(jid, 'text', alertMsg);
      await logAudit(req.user.id, 'WhatsApp Send Chat', `Queued low play hours alert to ${jid}`);
      res.json({ success: true, message: 'Low play hours alert queued successfully' });
    } else if (type === 'loyalty_tier') {
      const promoMsg = `*🎉 Tier Upgraded! 🎉*\n\nCongratulations! You have been upgraded to the *Gold Tier* at MineGaming!\n\nYou now enjoy a *15% flat discount* on all game sessions and priority booking. 🏆`;
      await queueWhatsAppMessage(jid, 'text', promoMsg);
      await logAudit(req.user.id, 'WhatsApp Send Chat', `Queued loyalty tier promo to ${jid}`);
      res.json({ success: true, message: 'Loyalty tier promo queued successfully' });
    } else {
      if (!message) {
        return res.status(400).json({ success: false, message: 'Message text is required' });
      }
      await queueWhatsAppMessage(jid, 'text', message);
      await logAudit(req.user.id, 'WhatsApp Send Chat', `Queued message to ${jid}`);
      res.json({ success: true, message: 'Message queued successfully' });
    }
  } catch (err) {
    console.error('[WhatsApp Send Message Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

module.exports = router;
