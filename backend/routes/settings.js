const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();
const SETTINGS_PATH = path.join(__dirname, '..', 'config', 'settings.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSettings(data) {
  const existing = readSettings() || {};
  const merged = { ...existing, ...data };
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key] !== null) {
      merged[key] = { ...(existing[key] || {}), ...data[key] };
    }
  });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

router.get('/', (req, res) => {
  const settings = readSettings();
  if (!settings) {
    return res.status(500).json({ success: false, message: 'Settings file not found' });
  }
  res.json({ success: true, settings });
});

router.put('/', (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }
  try {
    const updated = writeSettings(updates);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

module.exports = router;
