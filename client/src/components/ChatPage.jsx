import { useState, useRef, useEffect } from 'react';
import { classifyTask, createTask } from '../services/api';
import { useToast } from './Toast';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! 👋 Tell me about a task or upload an image, and I\'ll categorize it for you.\n\nExamples:\n• "Submit CS201 homework by Friday"\n• "Prepare for job interview next Monday"\n• Upload a photo of an assignment sheet',
    },
  ]);
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
      }
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend() {
    const text = input.trim();
    if (!text && !imageFile) return;
    if (isProcessing) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text || 'Uploaded an image for classification',
      image: imagePreviewUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentImageFile = imageFile;
    const currentImagePreview = imagePreviewUrl;
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Add typing indicator
    setIsProcessing(true);
    const typingMsg = { id: 'typing', role: 'assistant', isTyping: true };
    setMessages(prev => [...prev, typingMsg]);

    try {
      const result = await classifyTask(text || null, currentImageFile || null);

      // Remove typing indicator and add result
      setMessages(prev => prev.filter(m => m.id !== 'typing'));

      const resultMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've categorized this task for you:`,
        taskResult: result,
      };
      setMessages(prev => [...prev, resultMsg]);

      // Auto-save the task
      try {
        await createTask({
          title: result.title,
          description: result.description || '',
          category: result.category,
          dueDate: result.dueDate || null,
          source: currentImageFile ? 'chat-image' : 'chat-text',
        });

        showToast(`✅ Task saved to ${result.category}`, 'success');
      } catch (saveErr) {
        showToast('Failed to save task: ' + saveErr.message, 'error');
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't classify that. ${err.message}. Please try again.`,
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      if (currentImagePreview) URL.revokeObjectURL(currentImagePreview);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function autoResize(e) {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>✨ AI Task Assistant</h1>
        <p>Type a task or upload an image to auto-categorize</p>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            {msg.isTyping ? (
              <div className="chat-bubble">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            ) : (
              <div className="chat-bubble">
                {msg.image && (
                  <img src={msg.image} alt="Uploaded" className="chat-image-preview" />
                )}
                <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
                {msg.taskResult && (
                  <div className="chat-task-result">
                    <h4>{msg.taskResult.title}</h4>
                    {msg.taskResult.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {msg.taskResult.description}
                      </p>
                    )}
                    <div className="task-meta">
                      <span className={`task-category-chip ${msg.taskResult.category.toLowerCase()}`}>
                        {msg.taskResult.category}
                      </span>
                      {msg.taskResult.dueDate && (
                        <span className="task-due">
                          🕐 {new Date(msg.taskResult.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 8 }}>
                      ✓ Auto-saved
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div style={{ flex: 1 }}>
          {imageFile && (
            <div className="chat-image-pending">
              📎 {imageFile.name}
              <button onClick={clearImage}>Remove</button>
            </div>
          )}
          <div className="chat-input-wrapper">
            <button
              className="chat-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload image"
              title="Upload an image"
            >
              📷
            </button>
            <textarea
              ref={textInputRef}
              className="chat-text-input"
              placeholder="Describe a task or ask anything..."
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={handleKeyDown}
              rows={1}
              id="chat-text-input"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
              id="chat-image-input"
            />
          </div>
        </div>
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={isProcessing || (!input.trim() && !imageFile)}
          aria-label="Send message"
          id="chat-send-btn"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
