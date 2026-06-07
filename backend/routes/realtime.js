const express = require('express');
const router = express.Router();

// Store active clients
let clients = [];

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

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
