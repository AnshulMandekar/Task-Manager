import { updateTask, deleteTask } from '../services/api';

export default function TaskCard({ task, onUpdate, onDelete, onEdit, style }) {
  const isDone = task.status === 'done';
  const categoryClass = task.category.toLowerCase();

  function getDueLabel() {
    if (!task.dueDate) return null;

    const due = new Date(task.dueDate);
    const now = new Date();
    const diffMs = due - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    const timeStr = due.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const dateStr = due.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (diffMs < 0 && task.status === 'pending') {
      return { text: `Overdue · ${dateStr} ${timeStr}`, className: 'overdue' };
    }

    if (diffMins <= 60 && diffMins > 0) {
      return { text: `Due in ${diffMins}m · ${timeStr}`, className: 'due-soon' };
    }

    if (diffHours <= 24 && diffHours > 0) {
      return { text: `Due in ${diffHours}h · ${timeStr}`, className: '' };
    }

    return { text: `${dateStr} · ${timeStr}`, className: '' };
  }

  async function handleToggleStatus(e) {
    e.stopPropagation();
    const newStatus = isDone ? 'pending' : 'done';
    try {
      await updateTask(task._id, { status: newStatus });
      onUpdate?.();
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  }

  async function handleDelete(e) {
    e.stopPropagation();
    try {
      await deleteTask(task._id);
      onDelete?.(task);
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  const dueLabel = getDueLabel();

  return (
    <div
      className={`task-card ${categoryClass} ${isDone ? 'done' : ''}`}
      onClick={() => onEdit?.(task)}
      style={style}
      id={`task-${task._id}`}
    >
      <button
        className={`task-checkbox ${isDone ? 'checked' : ''}`}
        onClick={handleToggleStatus}
        aria-label={isDone ? 'Mark as pending' : 'Mark as done'}
      >
        {isDone && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </button>

      <div className="task-content">
        <div className="task-title">{task.title}</div>
        {task.description && (
          <div className="task-description">{task.description}</div>
        )}
        <div className="task-meta">
          <span className={`task-category-chip ${categoryClass}`}>
            {task.category}
          </span>
          {dueLabel && (
            <span className={`task-due ${dueLabel.className}`}>
              🕐 {dueLabel.text}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button
          className="task-action-btn delete"
          onClick={handleDelete}
          aria-label="Delete task"
          title="Delete"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
