const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/tasks — list tasks (filterable by category, status)
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = { userId: req.user.id };

    if (category && ['College', 'Job', 'Study'].includes(category)) {
      filter.category = category;
    }
    if (status && ['pending', 'done'].includes(status)) {
      filter.status = status;
    }

    const tasks = await Task.find(filter).sort({ dueDate: 1, createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// GET /api/tasks/today — tasks due today
router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const tasks = await Task.find({
      userId: req.user.id,
      dueDate: { $gte: startOfDay, $lt: endOfDay },
    }).sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    console.error('Get today tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch today\'s tasks.' });
  }
});

// POST /api/tasks — create task
router.post('/', async (req, res) => {
  try {
    const { title, description, category, dueDate, source } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required.' });
    }

    if (!['College', 'Job', 'Study'].includes(category)) {
      return res.status(400).json({ error: 'Category must be College, Job, or Study.' });
    }

    const task = new Task({
      userId: req.user.id,
      title: title.trim(),
      description: description?.trim() || '',
      category,
      dueDate: dueDate ? new Date(dueDate) : null,
      source: source || 'manual',
    });

    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, dueDate, status } = req.body;
    const update = {};

    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description.trim();
    if (category !== undefined) {
      if (!['College', 'Job', 'Study'].includes(category)) {
        return res.status(400).json({ error: 'Category must be College, Job, or Study.' });
      }
      update.category = category;
    }
    if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) {
      if (!['pending', 'done'].includes(status)) {
        return res.status(400).json({ error: 'Status must be pending or done.' });
      }
      update.status = status;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json(task);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id — delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ message: 'Task deleted.', task });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
