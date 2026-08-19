const mongoose = require('mongoose');

const subTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

const attachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'link'],
    required: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  label: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
});

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    category: {
      type: String,
      required: true,
      enum: ['College', 'Job', 'Study'],
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'done'],
      default: 'pending',
    },
    source: {
      type: String,
      enum: ['manual', 'chat-text', 'chat-image'],
      default: 'manual',
    },
    subTasks: {
      type: [subTaskSchema],
      default: [],
      validate: [arr => arr.length <= 20, 'A task can have at most 20 sub-tasks.'],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: [arr => arr.length <= 10, 'A task can have at most 10 attachments.'],
    },
    notifiedDueSoon: {
      type: Boolean,
      default: false,
    },
    notifiedOverdue: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Compound index for efficient queries
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Task', taskSchema);
