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
    const { title, description, category, dueDate, source, subTasks, attachments } = req.body;

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
      subTasks: Array.isArray(subTasks) ? subTasks.slice(0, 20) : [],
      attachments: Array.isArray(attachments) ? attachments.slice(0, 10) : [],
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
    const { title, description, category, dueDate, status, subTasks, attachments } = req.body;
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
    if (subTasks !== undefined) update.subTasks = Array.isArray(subTasks) ? subTasks.slice(0, 20) : [];
    if (attachments !== undefined) update.attachments = Array.isArray(attachments) ? attachments.slice(0, 10) : [];

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

// ─── Sub-Task Routes ──────────────────────────

// POST /api/tasks/:id/subtasks — add a sub-task
router.post('/:id/subtasks', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Sub-task title is required.' });
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (task.subTasks.length >= 20) {
      return res.status(400).json({ error: 'Maximum 20 sub-tasks allowed per task.' });
    }

    task.subTasks.push({ title: title.trim() });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error('Add sub-task error:', err);
    res.status(500).json({ error: 'Failed to add sub-task.' });
  }
});

// PUT /api/tasks/:id/subtasks/:subId — update a sub-task
router.put('/:id/subtasks/:subId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const subTask = task.subTasks.id(req.params.subId);
    if (!subTask) {
      return res.status(404).json({ error: 'Sub-task not found.' });
    }

    const { title, completed } = req.body;
    if (title !== undefined) subTask.title = title.trim();
    if (completed !== undefined) subTask.completed = Boolean(completed);

    await task.save();
    res.json(task);
  } catch (err) {
    console.error('Update sub-task error:', err);
    res.status(500).json({ error: 'Failed to update sub-task.' });
  }
});

// DELETE /api/tasks/:id/subtasks/:subId — remove a sub-task
router.delete('/:id/subtasks/:subId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const subTask = task.subTasks.id(req.params.subId);
    if (!subTask) {
      return res.status(404).json({ error: 'Sub-task not found.' });
    }

    task.subTasks.pull(req.params.subId);
    await task.save();
    res.json(task);
  } catch (err) {
    console.error('Delete sub-task error:', err);
    res.status(500).json({ error: 'Failed to delete sub-task.' });
  }
});

// ─── Attachment Routes ────────────────────────

// POST /api/tasks/:id/attachments — add an attachment
router.post('/:id/attachments', async (req, res) => {
  try {
    const { type, url, label } = req.body;

    if (!type || !['image', 'link'].includes(type)) {
      return res.status(400).json({ error: 'Attachment type must be "image" or "link".' });
    }
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Attachment URL is required.' });
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (task.attachments.length >= 10) {
      return res.status(400).json({ error: 'Maximum 10 attachments allowed per task.' });
    }

    task.attachments.push({ type, url: url.trim(), label: label?.trim() || '' });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error('Add attachment error:', err);
    res.status(500).json({ error: 'Failed to add attachment.' });
  }
});

// DELETE /api/tasks/:id/attachments/:attId — remove an attachment
router.delete('/:id/attachments/:attId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const att = task.attachments.id(req.params.attId);
    if (!att) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    task.attachments.pull(req.params.attId);
    await task.save();
    res.json(task);
  } catch (err) {
    console.error('Delete attachment error:', err);
    res.status(500).json({ error: 'Failed to delete attachment.' });
  }
});

module.exports = router;

