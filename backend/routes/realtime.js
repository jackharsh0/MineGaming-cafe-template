const express = require('express');
const router = express.Router();

// Store active clients
let clients = [];

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try {
      const refUrl = new URL(req.headers.referer);
      origin = refUrl.origin;
    } catch (e) {}
  }
  if (!origin) {
    origin = 'http://localhost:1000'; // Default fallback
  }

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:1000';
  const localOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

  if (localOriginPattern.test(origin) || origin === corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Send initial connected event
  res.write('data: ' + JSON.stringify({ type: 'connected', message: 'SSE Stream connected' }) + '\n\n');

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Broadcast helper
const broadcast = (type, data) => {
  const payload = JSON.stringify({ type, data });
  clients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
};

module.exports = {
  router,
  broadcast
};
