const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads (max 10MB, images only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'), false);
    }
  },
});

// All routes require authentication
router.use(auth);

// POST /api/chat/classify — classify text or image via LLM
router.post('/classify', upload.single('image'), async (req, res) => {
  try {
    let llmUrl = process.env.LLM_SERVICE_URL || 'http://localhost:8000';
    if (!llmUrl.startsWith('http://') && !llmUrl.startsWith('https://')) {
      llmUrl = `http://${llmUrl}`;
    }
    let response;

    if (req.file) {
      // Image upload — forward as multipart form data to Python service
      const formData = new FormData();
      formData.append('image', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      if (req.body.text) {
        formData.append('text', req.body.text);
      }

      response = await axios.post(`${llmUrl}/classify`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });
    } else if (req.body.text) {
      // Text only — send as JSON to the JSON-specific endpoint
      response = await axios.post(
        `${llmUrl}/classify-json`,
        { text: req.body.text },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );
    } else {
      return res.status(400).json({ error: 'Provide text or an image to classify.' });
    }

    res.json(response.data);
  } catch (err) {
    console.error('Chat classify error:', err.message);

    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.detail || 'LLM service error.',
      });
    }

    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'LLM service is not available. Please try again later.',
      });
    }

    res.status(500).json({ error: 'Failed to classify task.' });
  }
});

module.exports = router;
