const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const auth = require('../middleware/auth');
const ChatSession = require('../models/ChatSession');
const Task = require('../models/Task');

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

// ─── Chat Sessions CRUD ────────────────────────

// GET /api/chat/sessions — list sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.id })
      .select('title createdAt updatedAt')
      .sort({ updatedAt: -1 });
    res.json(sessions);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch chat sessions.' });
  }
});

// POST /api/chat/sessions — create new session
router.post('/sessions', async (req, res) => {
  try {
    const session = new ChatSession({
      userId: req.user.id,
      title: req.body.title || 'New Chat',
      messages: [
        {
          role: 'assistant',
          content: "Hi! 👋 Tell me about a task or upload an image, and I'll categorize it for you.\n\nOr ask me questions like:\n• \"What work should I do today?\"\n• \"What Job/Study work is pending?\"\n• \"Any generic advice on how to prioritize tasks?\""
        }
      ]
    });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create chat session.' });
  }
});

// GET /api/chat/sessions/:id — get single session
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found.' });
    }
    res.json(session);
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Failed to fetch chat session.' });
  }
});

// DELETE /api/chat/sessions/:id — delete session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await ChatSession.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found.' });
    }
    res.json({ message: 'Chat session deleted.' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Failed to delete chat session.' });
  }
});

// POST /api/chat/sessions/:id/messages — post message and get LLM response
router.post('/sessions/:id/messages', upload.single('image'), async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found.' });
    }

    let imageBase64 = null;
    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    let llmUrl = process.env.LLM_SERVICE_URL || 'http://localhost:8000';
    if (!llmUrl.startsWith('http://') && !llmUrl.startsWith('https://')) {
      llmUrl = `http://${llmUrl}`;
    }

    // 1. If there's an image: classify it and auto-save the task
    if (req.file) {
      const formData = new FormData();
      formData.append('image', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      if (req.body.text) {
        formData.append('text', req.body.text);
      }

      const response = await axios.post(`${llmUrl}/classify`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });

      const result = response.data;

      // Auto-save the task
      const task = new Task({
        userId: req.user.id,
        title: result.title,
        description: result.description || '',
        category: result.category,
        dueDate: result.dueDate ? new Date(result.dueDate) : null,
        source: 'chat-image',
      });
      await task.save();

      // Add to session messages
      session.messages.push({
        role: 'user',
        content: req.body.text || 'Uploaded an image for classification',
        image: imageBase64,
      });
      session.messages.push({
        role: 'assistant',
        content: `I've categorized this task for you:`,
        taskResult: {
          title: result.title,
          description: result.description,
          category: result.category,
          dueDate: result.dueDate,
        },
      });

      // Auto-rename session if it's still named 'New Chat'
      if (session.title === 'New Chat') {
        const query = req.body.text || 'Image Task';
        session.title = query.length > 25 ? query.substring(0, 25) + '...' : query;
      }

      await session.save();
      return res.json(session);
    }

    // 2. If it's text-only: query LLM service with full user tasks context
    // Fetch all user's tasks
    const tasks = await Task.find({ userId: req.user.id }).sort({ dueDate: 1 });
    const formattedTasks = tasks.map(t => ({
      title: t.title,
      description: t.description || '',
      category: t.category,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      status: t.status,
    }));

    // Send context to the fastapi chat endpoint
    const response = await axios.post(
      `${llmUrl}/chat-query`,
      {
        message: req.body.text,
        history: session.messages.map(m => ({ role: m.role, content: m.content })),
        tasks: formattedTasks,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    const result = response.data;

    let savedTaskObj = null;
    // If the LLM determined we should save a task:
    if (result.action === 'create_task' && result.task) {
      const task = new Task({
        userId: req.user.id,
        title: result.task.title,
        description: result.task.description || '',
        category: result.task.category,
        dueDate: result.task.dueDate ? new Date(result.task.dueDate) : null,
        source: 'chat-text',
      });
      await task.save();
      savedTaskObj = result.task;
    }

    // Save history in MongoDB
    session.messages.push({
      role: 'user',
      content: req.body.text,
      image: null,
    });
    session.messages.push({
      role: 'assistant',
      content: result.reply,
      taskResult: savedTaskObj,
    });

    // Auto-rename session if it's still named 'New Chat'
    if (session.title === 'New Chat') {
      const query = req.body.text || 'New Conversation';
      session.title = query.length > 25 ? query.substring(0, 25) + '...' : query;
    }

    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Chat error:', err.message);
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
    res.status(500).json({ error: 'Failed to process chat message.' });
  }
});

// POST /api/chat/classify — legacy endpoint (left for compatibility)
router.post('/classify', upload.single('image'), async (req, res) => {
  try {
    let llmUrl = process.env.LLM_SERVICE_URL || 'http://localhost:8000';
    if (!llmUrl.startsWith('http://') && !llmUrl.startsWith('https://')) {
      llmUrl = `http://${llmUrl}`;
    }
    let response;

    if (req.file) {
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
    res.status(500).json({ error: 'Failed to classify task.' });
  }
});

module.exports = router;
