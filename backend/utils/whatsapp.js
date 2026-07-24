const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

let clientInstance = null;
let connectionStatus = 'Disconnected';
let qrDataUrl = null;
let userInfo = null;

// Delay import to avoid circular dependency issues
const getRealtime = () => {
  try {
    return require('../routes/realtime');
  } catch (err) {
    return null;
  }
};

const broadcastStatus = () => {
  const rt = getRealtime();
  if (rt && rt.broadcast) {
    rt.broadcast('whatsapp_status', {
      status: connectionStatus,
      qr: qrDataUrl,
      user: userInfo
    });
  }
};

const broadcastMessage = (msg) => {
  const rt = getRealtime();
  if (rt && rt.broadcast) {
    rt.broadcast('whatsapp_message', {
      id: msg.id._serialized,
      body: msg.body,
      fromMe: msg.fromMe,
      sender: msg.from,
      to: msg.to,
      timestamp: msg.timestamp * 1000,
      type: msg.type,
      hasMedia: msg.hasMedia
    });
  }
};

const initializeWhatsApp = async () => {
  console.log('[WhatsApp] Initializing client...');
  connectionStatus = 'Connecting';
  broadcastStatus();

  let waRemoteVersion = '2.3000.1042282795-alpha';
  try {
    const res = await fetch('https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.currentAlpha) {
        waRemoteVersion = data.currentAlpha;
        console.log('[WhatsApp] Dynamically resolved latest Web version:', waRemoteVersion);
      }
    }
  } catch (err) {
    console.warn('[WhatsApp] Failed to dynamically resolve WA version, using fallback:', err.message);
  }

  // Create client with local auth persistence and cached web version
  clientInstance = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '../.wwebjs_auth')
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${waRemoteVersion}.html`,
      strict: false
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  clientInstance.on('qr', async (qr) => {
    console.log('[WhatsApp] QR Code received, generating data URL...');
    try {
      connectionStatus = 'QR_Ready';
      qrDataUrl = await qrcode.toDataURL(qr);
      broadcastStatus();
    } catch (err) {
      console.error('[WhatsApp] Failed to generate QR data URL:', err);
    }
  });

  clientInstance.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated successfully!');
    connectionStatus = 'Connecting';
    qrDataUrl = null;
    broadcastStatus();
  });

  clientInstance.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Authentication failure:', msg);
    connectionStatus = 'Disconnected';
    qrDataUrl = null;
    userInfo = null;
    broadcastStatus();
  });

  clientInstance.on('ready', () => {
    console.log('[WhatsApp] Client is ready!');
    connectionStatus = 'Connected';
    qrDataUrl = null;
    
    // Extract info from connected client
    const info = clientInstance.info;
    userInfo = {
      name: info.pushname || 'Connected Device',
      number: info.wid ? info.wid.user : 'Unknown',
      platform: info.platform || 'WhatsApp Web'
    };
    broadcastStatus();
    startQueueWorker(); // Start sequential queue worker
  });

  clientInstance.on('message', (msg) => {
    broadcastMessage(msg);
  });

  clientInstance.on('message_create', (msg) => {
    broadcastMessage(msg);
  });

  clientInstance.on('disconnected', async (reason) => {
    console.log('[WhatsApp] Client was disconnected:', reason);
    connectionStatus = 'Disconnected';
    qrDataUrl = null;
    userInfo = null;
    broadcastStatus();
    
    // Stop queue worker
    if (global.queueWorkerTimeout) {
      clearTimeout(global.queueWorkerTimeout);
      global.queueWorkerTimeout = null;
    }
    
    // Destroy and clean auth to allow scanning new QR
    try {
      await clientInstance.destroy();
    } catch (e) {}
    
    cleanAuthFolder();
    // Restart client automatically
    initializeWhatsApp();
  });

  clientInstance.initialize().catch(err => {
    console.error('[WhatsApp] Error during initialization:', err);
    connectionStatus = 'Disconnected';
    broadcastStatus();
  });
};

const cleanAuthFolder = () => {
  const authPath = path.join(__dirname, '../.wwebjs_auth');
  if (fs.existsSync(authPath)) {
    try {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('[WhatsApp] Cleaned authentication directory');
    } catch (err) {
      console.error('[WhatsApp] Failed to clean auth directory:', err);
    }
  }
};

const getWhatsAppStatus = () => {
  // If client is ready but status in memory is not connected, sync it
  if (clientInstance && clientInstance.info && connectionStatus === 'Disconnected') {
    connectionStatus = 'Connected';
  }
  return {
    status: connectionStatus,
    qr: qrDataUrl,
    user: userInfo
  };
};

const getChats = async () => {
  if (!clientInstance || connectionStatus !== 'Connected') {
    throw new Error('WhatsApp client is not connected');
  }
  const chats = await clientInstance.getChats();
  const formattedChats = [];
  
  for (const c of chats) {
    if (c.id.user === 'status') continue;
    
    let lastMsgPreview = '';
    let lastMsgTime = c.timestamp ? c.timestamp * 1000 : Date.now();
    
    if (c.lastMessage) {
      lastMsgPreview = c.lastMessage.type === 'chat' ? c.lastMessage.body : `[${c.lastMessage.type}]`;
      lastMsgTime = c.lastMessage.timestamp * 1000;
    } else {
      try {
        const msgs = await c.fetchMessages({ limit: 1 });
        if (msgs && msgs.length > 0) {
          const lastMsg = msgs[0];
          lastMsgPreview = lastMsg.type === 'chat' ? lastMsg.body : `[${lastMsg.type}]`;
          lastMsgTime = lastMsg.timestamp * 1000;
        }
      } catch (e) {}
    }

    formattedChats.push({
      id: c.id._serialized,
      name: c.name || c.id.user,
      unreadCount: c.unreadCount || 0,
      timestamp: lastMsgTime,
      isGroup: c.isGroup || false,
      lastMessage: lastMsgPreview
    });
  }

  return formattedChats.sort((a, b) => b.timestamp - a.timestamp);
};

const getChatMessages = async (chatId, limit = 50) => {
  if (!clientInstance || connectionStatus !== 'Connected') {
    throw new Error('WhatsApp client is not connected');
  }
  const chat = await clientInstance.getChatById(chatId);
  if (!chat) {
    throw new Error('Chat not found');
  }
  const messages = await chat.fetchMessages({ limit });
  return messages.map(m => ({
    id: m.id._serialized,
    body: m.body,
    fromMe: m.fromMe,
    sender: m.from,
    timestamp: m.timestamp * 1000,
    type: m.type,
    hasMedia: m.hasMedia,
    filename: m.type === 'document' ? m.body : null
  }));
};

const disconnectWhatsApp = async () => {
  console.log('[WhatsApp] Disconnecting client...');
  const originalStatus = connectionStatus;
  connectionStatus = 'Disconnected';
  qrDataUrl = null;
  userInfo = null;
  broadcastStatus();

  if (clientInstance) {
    try {
      if (originalStatus === 'Connected') {
        // Only attempt graceful logout if previously fully connected
        await Promise.race([
          clientInstance.logout(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000))
        ]);
      } else {
        await Promise.race([
          clientInstance.destroy(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Destroy timeout')), 3000))
        ]);
      }
    } catch (err) {
      console.warn('[WhatsApp] Logout/destroy failed or timed out:', err.message);
      try {
        if (clientInstance.pupBrowser) {
          await clientInstance.pupBrowser.close().catch(() => {});
        }
      } catch (e) {}
    }
  }

  clientInstance = null;
  cleanAuthFolder();
  // Re-initialize to get a fresh QR code
  initializeWhatsApp();
  return { success: true };
};

const generateInvoicePDF = (data) => {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const itemsCount = (data.items || []).length;
    const computedHeight = Math.max(380, 240 + (itemsCount * 22)); 
    const doc = new PDFDocument({ size: [280, computedHeight], margin: 12 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      resolve(result.toString('base64'));
    });
    doc.on('error', err => reject(err));

    // Draw Kraft-like double borders
    doc.rect(4, 4, 272, computedHeight - 8).strokeColor('#8b5a2b').lineWidth(1.2).stroke();
    doc.rect(7, 7, 266, computedHeight - 14).strokeColor('#8b5a2b').lineWidth(0.5).stroke();

    // Vintage Heading
    doc.fillColor('#4a2e1b');
    doc.font('Times-Bold').fontSize(14).text('SOLEILA', { align: 'center', paragraphGap: 1 });
    doc.font('Times-Roman').fontSize(8).text('GAMING LOUNGE & CAFE', { align: 'center', characterSpacing: 1.2 });
    doc.font('Times-Italic').fontSize(7.5).text('Est. 2026 -- Retro Kraft', { align: 'center' });
    doc.moveDown(0.4);

    // Header separator line
    doc.moveTo(12, doc.y).lineTo(268, doc.y).strokeColor('#8b5a2b').lineWidth(0.75).stroke();
    doc.moveDown(0.4);

    // Invoice Info
    doc.font('Courier-Bold').fontSize(8.5).fillColor('#2d1a0e');
    doc.text(`INVOICE: #${data.receiptId}`);
    doc.font('Courier').fontSize(8);
    
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    doc.text(`Date: ${formattedDate}`);
    doc.text(`Customer: ${data.customerName || 'Walk-in'}`);
    if (data.stationName) {
      doc.text(`Station: ${data.stationName}`);
    }

    doc.moveDown(0.3);
    doc.moveTo(12, doc.y).lineTo(268, doc.y).strokeColor('#8b5a2b').lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    // Items list header
    const headerY = doc.y;
    doc.font('Courier-Bold').fontSize(8.5);
    doc.text('Description', 12, headerY, { width: 130 });
    doc.text('Qty', 145, headerY, { width: 35, align: 'right' });
    doc.text('Amount', 185, headerY, { width: 83, align: 'right' });
    doc.moveDown(0.4);

    // Items table content
    doc.font('Courier').fontSize(7.5);
    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        doc.moveDown(0.1);
        const itemY = doc.y;
        const itemName = item.name.length > 20 ? item.name.slice(0, 18) + '..' : item.name;
        doc.text(itemName, 12, itemY, { width: 130 });
        doc.text(String(item.quantity), 145, itemY, { width: 35, align: 'right' });
        doc.text(`Rs. ${parseFloat(item.totalPrice).toFixed(2)}`, 185, itemY, { width: 83, align: 'right' });
      });
      doc.moveDown(0.4);
    } else {
      doc.text('(No catalog items)', 12, doc.y);
      doc.moveDown(0.4);
    }

    // Totals Section
    doc.moveTo(12, doc.y).lineTo(268, doc.y).strokeColor('#8b5a2b').lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    let totalsY = doc.y;
    
    doc.font('Courier-Bold').fontSize(8);
    doc.text('Subtotal:', 100, totalsY);
    doc.font('Courier').text(`Rs. ${parseFloat(data.subtotal).toFixed(2)}`, 185, totalsY, { width: 83, align: 'right' });
    
    if (parseFloat(data.discount) > 0) {
      doc.moveDown(1.1);
      totalsY = doc.y;
      doc.font('Courier-Bold').text('Discount:', 100, totalsY);
      doc.font('Courier').text(`-Rs. ${parseFloat(data.discount).toFixed(2)}`, 185, totalsY, { width: 83, align: 'right' });
    }

    doc.moveDown(1.1);
    totalsY = doc.y;
    doc.font('Courier-Bold').text(`Tax (${data.taxRate || 10}%):`, 100, totalsY);
    doc.font('Courier').text(`Rs. ${parseFloat(data.tax).toFixed(2)}`, 185, totalsY, { width: 83, align: 'right' });

    doc.moveDown(1.3);
    totalsY = doc.y;
    doc.font('Courier-Bold').fontSize(9.5);
    doc.text('TOTAL PAID:', 100, totalsY);
    doc.text(`Rs. ${parseFloat(data.total).toFixed(2)}`, 185, totalsY, { width: 83, align: 'right' });

    // Footer
    doc.moveDown(1.5);
    doc.font('Times-Italic').fontSize(8.5).fillColor('#4a2e1b').text('Thank you for playing at Soleila!', { align: 'center', paragraphGap: 1 });
    doc.font('Times-Roman').fontSize(7.5).text('Please visit again!', { align: 'center' });

    doc.end();
  });
};

let isProcessingQueue = false;

// Helper to validate basic phone format
const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  const cleaned = phone.split('@')[0].replace(/[^\d]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// Helper to apply randomized spintax signature to make text messages binary-unique (bypasses duplicate spam filters)
const applyAntiBanRandomization = (text) => {
  if (!text) return text;
  if (text.length > 500 && !text.includes('\n')) {
    return text; // Skip base64 pdf strings
  }
  const friendlySignatures = [
    "Have a fantastic day! 🎮",
    "Enjoy your gaming session! ⚡",
    "Thanks for choosing Soleila! 🌟",
    "Let us know if you need anything at the desk! 🛎️",
    "Happy gaming! 🏆",
    "Keep leveling up! 🚀"
  ];
  const randomSig = friendlySignatures[Math.floor(Math.random() * friendlySignatures.length)];
  const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${text}\n\n_${randomSig}_\n` + "`" + `[Ref: SOL-${uniqueId}]` + "`";
};

let pacingMin = 7;
let pacingMax = 15;

const setQueuePacing = (min, max) => {
  pacingMin = parseInt(min) || 7;
  pacingMax = parseInt(max) || 15;
  console.log(`[WhatsApp Queue] Dynamic pacing updated: min = ${pacingMin}s, max = ${pacingMax}s`);
};

const startQueueWorker = () => {
  if (global.queueWorkerTimeout) {
    clearTimeout(global.queueWorkerTimeout);
  }

  // Load pacing settings from database once on startup
  const loadPacingSettings = async () => {
    try {
      const pool = require('../config/db');
      const [rows] = await pool.query(
        "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('whatsapp_pacing_min', 'whatsapp_pacing_max')"
      );
      rows.forEach(r => {
        if (r.setting_key === 'whatsapp_pacing_min') pacingMin = parseInt(r.setting_value) || 7;
        if (r.setting_key === 'whatsapp_pacing_max') pacingMax = parseInt(r.setting_value) || 15;
      });
      console.log(`[WhatsApp Queue] Loaded pacing settings: min = ${pacingMin}s, max = ${pacingMax}s`);
    } catch (err) {
      console.warn('[WhatsApp Queue] Failed to load pacing settings from DB, using defaults:', err.message);
    }
  };
  loadPacingSettings();
  
  const processNextQueueItem = async () => {
    if (connectionStatus !== 'Connected' || !clientInstance) {
      global.queueWorkerTimeout = setTimeout(processNextQueueItem, 5000);
      return;
    }
    
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    
    let conn;
    try {
      const pool = require('../config/db');
      conn = await pool.getConnection();
      
      // Anti-ban Hourly and Daily rate limit caps check
      const [hourlyCount] = await conn.query(
        "SELECT COUNT(*) as count FROM whatsapp_queue WHERE status = 'sent' AND processed_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)"
      );
      const [dailyCount] = await conn.query(
        "SELECT COUNT(*) as count FROM whatsapp_queue WHERE status = 'sent' AND processed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
      );

      if (hourlyCount[0].count >= 60 || dailyCount[0].count >= 200) {
        console.warn(`[WhatsApp Rate Limiter] Hourly limit (60) or daily limit (200) reached. Cooling down queue worker for 2 minutes to protect linked account.`);
        isProcessingQueue = false;
        conn.release();
        global.queueWorkerTimeout = setTimeout(processNextQueueItem, 120000); // 2 minute cool down sleep
        return;
      }

      const [rows] = await conn.query(
        "SELECT * FROM whatsapp_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1"
      );
      
      if (rows.length === 0) {
        isProcessingQueue = false;
        conn.release();
        global.queueWorkerTimeout = setTimeout(processNextQueueItem, 3000);
        return;
      }
      
      const item = rows[0];
      
      await conn.query(
        "UPDATE whatsapp_queue SET status = 'sending', attempts = attempts + 1 WHERE id = ?",
        [item.id]
      );
      
      let sendSuccess = false;
      let errorMsg = null;
      
      try {
        let recipient = item.to_phone;
        if (!recipient.includes('@')) {
          recipient = recipient.replace(/[^\d]/g, '');
          if (recipient.length === 10) {
            recipient = `91${recipient}`;
          }
          recipient = `${recipient}@c.us`;
        }
        
        if (item.message_type === 'pdf_invoice') {
          const { MessageMedia } = require('whatsapp-web.js');
          const media = new MessageMedia('application/pdf', item.message_body, item.pdf_filename || 'invoice.pdf');
          await clientInstance.sendMessage(recipient, media, { caption: item.caption || '' });
        } else {
          await clientInstance.sendMessage(recipient, item.message_body);
        }
        sendSuccess = true;
        console.log(`[WhatsApp Queue] Message sent successfully to ${recipient} (Item ID: ${item.id})`);
      } catch (err) {
        errorMsg = err.message || 'Unknown sending error';
        console.error(`[WhatsApp Queue] Failed to send item ID ${item.id}:`, errorMsg);
      }
      
      if (sendSuccess) {
        await conn.query(
          "UPDATE whatsapp_queue SET status = 'sent', processed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [item.id]
        );
      } else {
        const nextStatus = item.attempts >= 3 ? 'failed' : 'pending';
        await conn.query(
          "UPDATE whatsapp_queue SET status = ?, error_message = ? WHERE id = ?",
          [nextStatus, errorMsg, item.id]
        );
      }
      
      isProcessingQueue = false;
      conn.release();
      
      // Random delay between pacingMin and pacingMax seconds
      const delayMs = (Math.floor(Math.random() * (pacingMax - pacingMin + 1)) + pacingMin) * 1000;
      global.queueWorkerTimeout = setTimeout(processNextQueueItem, delayMs);
      
    } catch (err) {
      console.error('[WhatsApp Queue Worker Error]:', err);
      isProcessingQueue = false;
      if (conn) conn.release();
      global.queueWorkerTimeout = setTimeout(processNextQueueItem, 5000);
    }
  };
  
  global.queueWorkerTimeout = setTimeout(processNextQueueItem, 2000);
  console.log('[WhatsApp Queue] Sequential anti-banning worker started.');
};

const queueWhatsAppMessage = async (to, type, body, pdfFilename = null, caption = null) => {
  if (!validatePhoneNumber(to)) {
    throw new Error(`Invalid phone number format (${to}). Recipient number must contain between 10 to 15 digits.`);
  }

  const pool = require('../config/db');
  let cleanNumber = to;
  if (!to.includes('@')) {
    cleanNumber = to.replace(/[^\d]/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = `91${cleanNumber}`;
    }
    cleanNumber = `${cleanNumber}@c.us`;
  }
  
  // Anti-ban content randomization (spintax)
  let finalBody = body;
  let finalCaption = caption;
  if (type === 'text') {
    finalBody = applyAntiBanRandomization(body);
  }
  if (caption) {
    finalCaption = applyAntiBanRandomization(caption);
  }

  await pool.query(
    `INSERT INTO whatsapp_queue (to_phone, message_type, message_body, pdf_filename, caption, status) 
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [cleanNumber, type, finalBody, pdfFilename, finalCaption]
  );
  
  console.log(`[WhatsApp Queue] Queued ${type} message for ${cleanNumber}`);
};

const sendWhatsAppMessage = async (to, body) => {
  await queueWhatsAppMessage(to, 'text', body);
  return { success: true, queued: true };
};

const sendWhatsAppInvoice = async (to, invoiceData) => {
  const pdfBase64 = await generateInvoicePDF(invoiceData);
  const captionText = `*🎮 Receipt from Soleila Gaming Zone* 🎮\n` +
    `Thank you for your visit! Attached is your invoice #${invoiceData.receiptId} for Rs. ${parseFloat(invoiceData.total).toFixed(2)}.`;
  
  await queueWhatsAppMessage(
    to, 
    'pdf_invoice', 
    pdfBase64, 
    `invoice_${invoiceData.receiptId}.pdf`, 
    captionText
  );
  return { success: true, queued: true };
};

module.exports = {
  initializeWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
  sendWhatsAppMessage,
  sendWhatsAppInvoice,
  startQueueWorker,
  queueWhatsAppMessage,
  getChats,
  getChatMessages,
  setQueuePacing
};
