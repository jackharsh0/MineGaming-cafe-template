const pool = require('../config/db');
const { broadcast } = require('../routes/realtime');

const logAudit = async (userId, action, details) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, details]
    );
    // Broadcast via SSE activity feed
    broadcast('activity_feed', {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

const getSystemSetting = async (key, defaultValue) => {
  try {
    const [rows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
    if (rows.length > 0) {
      return rows[0].setting_value;
    }
    return defaultValue;
  } catch (err) {
    console.error(`Error fetching system setting ${key}:`, err);
    return defaultValue;
  }
};

const getLoyaltyDiscount = async (tier) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.setting_key] = parseFloat(r.setting_value) / 100;
    });
    
    switch (tier) {
      case 'Gold': return settings['discount_gold'] !== undefined ? settings['discount_gold'] : 0.15;
      case 'Silver': return settings['discount_silver'] !== undefined ? settings['discount_silver'] : 0.10;
      case 'Bronze':
      default: return settings['discount_bronze'] !== undefined ? settings['discount_bronze'] : 0.05;
    }
  } catch (err) {
    console.error('Failed to load loyalty discount settings from DB:', err);
    switch (tier) {
      case 'Gold': return 0.15;
      case 'Silver': return 0.10;
      case 'Bronze':
      default: return 0.05;
    }
  }
};

// Pricing rule utility
const calculateHourlyRate = async (stationType, loyaltyTier, controllerCount = 1) => {
  const [rules] = await pool.query('SELECT * FROM pricing_rules WHERE station_type = ?', [stationType]);
  if (rules.length === 0) return 0;
  
  const rule = rules[0];
  let rate = rule.hourly_rate;
  
  // Add controller rate for extra controllers (1 is default/free, >1 are extra)
  if (controllerCount > 1 && rule.controller_addon_rate > 0) {
    rate = parseFloat(rate) + ((controllerCount - 1) * parseFloat(rule.controller_addon_rate));
  }
  
  // Apply loyalty discount
  const discountPct = await getLoyaltyDiscount(loyaltyTier);
  rate = parseFloat(rate) * (1 - discountPct);
  
  return parseFloat(rate.toFixed(2));
};

module.exports = {
  logAudit,
  getSystemSetting,
  getLoyaltyDiscount,
  calculateHourlyRate
};
