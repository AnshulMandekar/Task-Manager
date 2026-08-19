import { useState, useEffect } from 'react';
import { createTask, updateTask } from '../services/api';
import { XIcon, CollegeIcon, JobIcon, StudyIcon } from './Icons';

export default function TaskModal({ task, defaultCategory, onClose, onSaved }) {
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('College');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sub-tasks state
  const [subTasks, setSubTasks] = useState([]);
  const [newSubTask, setNewSubTask] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [attType, setAttType] = useState('link');
  const [attUrl, setAttUrl] = useState('');
  const [attLabel, setAttLabel] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setCategory(task.category || 'College');
      setDueDate(task.dueDate ? formatDateForInput(task.dueDate) : '');
      setSubTasks(task.subTasks ? task.subTasks.map(st => ({ ...st })) : []);
      setAttachments(task.attachments ? task.attachments.map(a => ({ ...a })) : []);
    } else if (defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [task, defaultCategory]);

  function formatDateForInput(dateStr) {
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ─── Sub-task helpers ─────────────────────────
  function handleAddSubTask() {
    if (!newSubTask.trim() || subTasks.length >= 20) return;
    setSubTasks([...subTasks, { title: newSubTask.trim(), completed: false }]);
    setNewSubTask('');
  }

  function handleSubTaskKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubTask();
    }
  }

  function toggleSubTask(index) {
    setSubTasks(subTasks.map((st, i) =>
      i === index ? { ...st, completed: !st.completed } : st
    ));
  }

  function removeSubTask(index) {
    setSubTasks(subTasks.filter((_, i) => i !== index));
  }

  // ─── Attachment helpers ───────────────────────
  function handleAddAttachment() {
    if (!attUrl.trim() || attachments.length >= 10) return;
    setAttachments([...attachments, { type: attType, url: attUrl.trim(), label: attLabel.trim() }]);
    setAttUrl('');
    setAttLabel('');
  }

  function handleAttKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAttachment();
    }
  }

  function removeAttachment(index) {
    setAttachments(attachments.filter((_, i) => i !== index));
  }

  // ─── Submit ───────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        subTasks: subTasks.map(st => ({ title: st.title, completed: st.completed })),
        attachments: attachments.map(a => ({ type: a.type, url: a.url, label: a.label })),
      };

      if (isEditing) {
        await updateTask(task._id, payload);
      } else {
        await createTask({ ...payload, source: 'manual' });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="task-title">Title *</label>
            <input
              id="task-title"
              className="form-input"
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              className="form-input"
              placeholder="Add details (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <div className="category-selector">
              {['College', 'Job', 'Study'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-option ${cat.toLowerCase()} ${category === cat ? 'selected' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    {cat === 'College' ? <CollegeIcon size={16} /> : cat === 'Job' ? <JobIcon size={16} /> : <StudyIcon size={16} />}
                    {cat}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="task-due-date">Due Date</label>
            <input
              id="task-due-date"
              className="form-input"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* ─── Sub-Tasks Section ─────────────────── */}
          <div className="form-group">
            <label>Sub-tasks <span className="form-hint">({subTasks.length}/20)</span></label>
            <div className="subtask-input-row">
              <input
                className="form-input"
                type="text"
                placeholder="Add a sub-task…"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                onKeyDown={handleSubTaskKeyDown}
                maxLength={200}
              />
              <button
                type="button"
                className="btn btn-small btn-primary"
                onClick={handleAddSubTask}
                disabled={!newSubTask.trim() || subTasks.length >= 20}
              >
                +
              </button>
            </div>
            {subTasks.length > 0 && (
              <ul className="subtask-list">
                {subTasks.map((st, i) => (
                  <li key={st._id || i} className={`subtask-item ${st.completed ? 'completed' : ''}`}>
                    <button
                      type="button"
                      className={`subtask-checkbox ${st.completed ? 'checked' : ''}`}
                      onClick={() => toggleSubTask(i)}
                      aria-label={st.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {st.completed && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                    <span className="subtask-title">{st.title}</span>
                    <button
                      type="button"
                      className="subtask-remove"
                      onClick={() => removeSubTask(i)}
                      aria-label="Remove sub-task"
                    >
                      <XIcon size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ─── Attachments Section ───────────────── */}
          <div className="form-group">
            <label>Attachments <span className="form-hint">({attachments.length}/10)</span></label>
            <div className="attachment-type-toggle">
              <button
                type="button"
                className={`att-type-btn ${attType === 'link' ? 'active' : ''}`}
                onClick={() => setAttType('link')}
              >
                🔗 Link
              </button>
              <button
                type="button"
                className={`att-type-btn ${attType === 'image' ? 'active' : ''}`}
                onClick={() => setAttType('image')}
              >
                🖼️ Image
              </button>
            </div>
            <div className="attachment-input-row">
              <input
                className="form-input"
                type="url"
                placeholder={attType === 'image' ? 'Paste image URL…' : 'Paste link URL…'}
                value={attUrl}
                onChange={(e) => setAttUrl(e.target.value)}
                onKeyDown={handleAttKeyDown}
              />
              <input
                className="form-input att-label-input"
                type="text"
                placeholder="Label (optional)"
                value={attLabel}
                onChange={(e) => setAttLabel(e.target.value)}
                onKeyDown={handleAttKeyDown}
                maxLength={200}
              />
              <button
                type="button"
                className="btn btn-small btn-primary"
                onClick={handleAddAttachment}
                disabled={!attUrl.trim() || attachments.length >= 10}
              >
                +
              </button>
            </div>
            {attachments.length > 0 && (
              <ul className="attachment-list">
                {attachments.map((att, i) => (
                  <li key={att._id || i} className="attachment-item">
                    <div className="attachment-info">
                      {att.type === 'image' ? (
                        <img
                          src={att.url}
                          alt={att.label || 'Attachment'}
                          className="attachment-thumbnail"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="attachment-icon">🔗</span>
                      )}
                      <div className="attachment-details">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="attachment-url"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {att.label || att.url}
                        </a>
                        <span className="attachment-type-badge">{att.type}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="subtask-remove"
                      onClick={() => removeAttachment(i)}
                      aria-label="Remove attachment"
                    >
                      <XIcon size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title.trim()}
            >
              {loading ? (
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
              ) : (
                isEditing ? 'Save Changes' : 'Add Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

