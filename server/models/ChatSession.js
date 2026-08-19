const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Store base64 data url for user uploaded images
    default: null,
  },
  taskResult: {
    title: { type: String },
    description: { type: String },
    category: { type: String, enum: ['College', 'Job', 'Study'] },
    dueDate: { type: Date, default: null },
    subTasks: {
      type: [{ title: { type: String }, completed: { type: Boolean, default: false } }],
      default: [],
    },
    attachments: {
      type: [{ type: { type: String, enum: ['image', 'link'] }, url: { type: String }, label: { type: String, default: '' } }],
      default: [],
    },
  },
  isError: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    default: 'New Chat',
    trim: true,
  },
  messages: [chatMessageSchema],
}, {
  timestamps: true,
});

// Compound index to search quickly by userId and updatedAt
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
