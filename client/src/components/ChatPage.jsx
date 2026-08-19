import { useState, useRef, useEffect } from 'react';
import {
  getChatSessions,
  createChatSession,
  getChatSession,
  deleteChatSession,
  sendChatMessage
} from '../services/api';
import { useToast } from './Toast';
import {
  ChatIcon,
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  PaperclipIcon,
  CameraIcon,
  SendIcon
} from './Icons';

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchSessions() {
    try {
      const data = await getChatSessions();
      setSessions(data);
      if (data.length > 0) {
        // Load the most recent session
        loadSession(data[0]._id);
      } else {
        // Automatically create a new session if none exist
        await handleNewChat();
      }
    } catch (err) {
      showToast('Failed to load chat history', 'error');
    }
  }

  async function loadSession(id) {
    try {
      setActiveSessionId(id);
      const data = await getChatSession(id);
      setMessages(data.messages || []);
    } catch (err) {
      showToast('Failed to load chat messages', 'error');
    }
  }

  async function handleNewChat() {
    try {
      const newSession = await createChatSession('New Chat');
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession._id);
      setMessages(newSession.messages || []);
      showToast('Started a new chat session', 'success');
    } catch (err) {
      showToast('Failed to start new chat', 'error');
    }
  }

  async function handleDeleteSession(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation? All messages will be lost.')) return;
    try {
      await deleteChatSession(id);
      const updated = sessions.filter(s => s._id !== id);
      setSessions(updated);
      showToast('Conversation deleted', 'success');
      
      if (activeSessionId === id) {
        if (updated.length > 0) {
          loadSession(updated[0]._id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      showToast('Failed to delete conversation', 'error');
    }
  }

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

  async function handleSend(overrideText = null) {
    const text = (overrideText !== null ? overrideText : input).trim();
    if (!text && !imageFile) return;
    if (isProcessing) return;
    if (!activeSessionId) return;

    // Add user message locally for instant response feel
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
      const response = await sendChatMessage(activeSessionId, text || null, currentImageFile || null);

      // Remove typing indicator and sync full messages history
      setMessages(response.messages || []);

      // If the session title was previously "New Chat", rename it locally
      const activeSession = sessions.find(s => s._id === activeSessionId);
      if (activeSession && activeSession.title === 'New Chat') {
        const newTitle = text ? (text.length > 20 ? text.substring(0, 20) + '...' : text) : 'Image Task';
        setSessions(prev =>
          prev.map(s => (s._id === activeSessionId ? { ...s, title: newTitle } : s))
        );
      }

      // Check if a task was auto-saved and trigger toast
      const lastMsg = response.messages[response.messages.length - 1];
      if (lastMsg && lastMsg.taskResult && lastMsg.taskResult.category) {
        showToast(`Task saved to ${lastMsg.taskResult.category}`, 'success');
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't process that. ${err.message}. Please try again.`,
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

  // Handle suggestion click
  async function handleSuggestionClick(text) {
    if (isProcessing) return;
    setInput(text);
    setTimeout(() => {
      handleSend(text);
    }, 50);
  }

  // Quick suggestions chips
  const suggestions = [
    { label: "What should I do today?", text: "what work should i do today?" },
    { label: "What Job tasks are pending?", text: "What work is pending regarding job?" },
    { label: "What Study tasks are pending?", text: "What work is pending regarding study?" },
    { label: "Help me prioritize", text: "Help me analyze my task list and suggest how to prioritize." }
  ];

  // Helper to format assistant response (bold, lists)
  function formatContent(text) {
    if (!text) return '';
    // Format bold text
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Format bullet points
    formatted = formatted.replace(/^\s*[-•]\s*(.*?)$/gm, '<li>$1</li>');
    // Wrap lists in ul
    if (formatted.includes('<li>')) {
      // Find lists and wrap them
      const lines = formatted.split('\n');
      let inList = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('<li>')) {
          if (!inList) {
            lines[i] = '<ul>' + lines[i];
            inList = true;
          }
        } else {
          if (inList) {
            lines[i - 1] = lines[i - 1] + '</ul>';
            inList = false;
          }
        }
      }
      if (inList) {
        lines[lines.length - 1] = lines[lines.length - 1] + '</ul>';
      }
      formatted = lines.join('\n');
    }
    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="chat-bubble-text" />;
  }

  return (
    <div className="chat-layout">
      {/* Sidebar Panel for Sessions */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ChatIcon size={16} /> Chat History
          </h3>
          <button className="new-chat-btn" onClick={handleNewChat} title="New Conversation">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <PlusIcon size={14} /> New Chat
            </span>
          </button>
        </div>
        <div className="sessions-list">
          {sessions.map((session) => (
            <div
              key={session._id}
              className={`session-item ${activeSessionId === session._id ? 'active' : ''}`}
              onClick={() => loadSession(session._id)}
            >
              <span className="session-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <ChatIcon size={14} />
              </span>
              <span className="session-title" title={session.title}>{session.title}</span>
              <button
                className="delete-session-btn"
                onClick={(e) => handleDeleteSession(session._id, e)}
                title="Delete Chat"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="chat-main">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle Sidebar"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              {isSidebarOpen ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />}
              <span>History</span>
            </button>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SparklesIcon size={20} style={{ color: 'var(--primary)' }} /> AI Task Assistant
              </h1>
              <p>Ask about your tasks, check deadlines, or upload assignment pictures</p>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`chat-message ${msg.role}`}>
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
                  {formatContent(msg.content)}
                  
                  {msg.taskResult && msg.taskResult.title && msg.taskResult.category && (
                    <div className="chat-task-result">
                      <div className="task-result-header">
                        <h4>{msg.taskResult.title}</h4>
                        <span className={`task-category-chip ${msg.taskResult.category.toLowerCase()}`}>
                          {msg.taskResult.category}
                        </span>
                      </div>
                      {msg.taskResult.description && (
                        <p className="task-result-desc">
                          {msg.taskResult.description}
                        </p>
                      )}

                      {/* Sub-tasks list */}
                      {msg.taskResult.subTasks && msg.taskResult.subTasks.length > 0 && (
                        <div className="task-result-subtasks">
                          <p className="task-result-subtasks-label">📋 Sub-tasks:</p>
                          <ul className="task-result-subtask-list">
                            {msg.taskResult.subTasks.map((st, stIdx) => (
                              <li key={stIdx} className="task-result-subtask-item">
                                <span className="task-result-subtask-bullet">○</span>
                                <span>{st.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Attachments list */}
                      {msg.taskResult.attachments && msg.taskResult.attachments.length > 0 && (
                        <div className="task-result-attachments">
                          <p className="task-result-attachments-label">📎 Attachments:</p>
                          <ul className="task-result-attachment-list">
                            {msg.taskResult.attachments.map((att, attIdx) => (
                              <li key={attIdx} className="task-result-attachment-item">
                                {att.type === 'image' ? (
                                  <div className="task-result-attachment-image">
                                    <img
                                      src={att.url}
                                      alt={att.label || 'Screenshot'}
                                      className="task-result-thumbnail"
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span className="task-result-att-label">{att.label || 'Screenshot'}</span>
                                  </div>
                                ) : (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="task-result-link"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    🔗 {att.label || att.url}
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="task-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {msg.taskResult.dueDate ? (
                          <span className="task-due" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ClockIcon size={12} /> Due: {new Date(msg.taskResult.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="task-due no-due" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ClockIcon size={12} /> No due date
                          </span>
                        )}
                        <span className="task-saved-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircleIcon size={12} style={{ color: 'var(--success)' }} /> Auto-saved to List
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Render suggestion chips only if there's only 1 welcome message */}
          {messages.length <= 1 && !isProcessing && (
            <div className="chat-suggestions">
              <p className="suggestions-prompt">Quick tasks queries:</p>
              <div className="suggestions-chips-grid">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(s.text)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div style={{ flex: 1 }}>
            {imageFile && (
              <div className="chat-image-pending" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PaperclipIcon size={14} />
                <span>{imageFile.name}</span>
                <button onClick={clearImage} style={{ marginLeft: 'auto' }}>Remove</button>
              </div>
            )}
            <div className="chat-input-wrapper">
              <button
                className="chat-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload image"
                title="Upload an image"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <CameraIcon size={18} />
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
            onClick={() => handleSend()}
            disabled={isProcessing || (!input.trim() && !imageFile)}
            aria-label="Send message"
            id="chat-send-btn"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SendIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
