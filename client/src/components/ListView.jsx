import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getTasks } from '../services/api';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const categoryMeta = {
  college: { name: 'College', icon: '🎓', emoji: '📚' },
  job: { name: 'Job', icon: '💼', emoji: '🏢' },
  study: { name: 'Study', icon: '📖', emoji: '🧠' },
};

export default function ListView() {
  const location = useLocation();
  const category = location.pathname.replace('/', '') || 'college';
  const meta = categoryMeta[category] || categoryMeta.college;

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const params = { category: meta.name };
      if (filter !== 'all') {
        params.status = filter;
      }
      const data = await getTasks(params);
      setTasks(data);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [meta.name, filter]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  function handleEdit(task) {
    setEditingTask(task);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingTask(null);
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <>
      <div className="list-category-header">
        <div className={`list-category-icon ${category}`}>
          {meta.icon}
        </div>
        <div className="list-category-info">
          <h1>{meta.name}</h1>
          <div className="list-category-count">
            {pendingCount} pending · {doneCount} completed
          </div>
        </div>
      </div>

      <div className="filter-tabs">
        {['all', 'pending', 'done'].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner"></div>
        </div>
      ) : tasks.length > 0 ? (
        <div className="task-list">
          {tasks.map((task, i) => (
            <TaskCard
              key={task._id}
              task={task}
              onUpdate={fetchTasks}
              onDelete={fetchTasks}
              onEdit={handleEdit}
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">{meta.emoji}</div>
          <h3>No {meta.name.toLowerCase()} tasks yet</h3>
          <p>
            {filter === 'done'
              ? 'Complete some tasks and they\'ll show up here.'
              : 'Tap the + button to add your first task.'}
          </p>
        </div>
      )}

      <button
        className="fab"
        onClick={() => setShowModal(true)}
        aria-label={`Add ${meta.name} task`}
        id={`add-${category}-task-fab`}
      >
        +
      </button>

      {showModal && (
        <TaskModal
          task={editingTask}
          defaultCategory={meta.name}
          onClose={handleCloseModal}
          onSaved={fetchTasks}
        />
      )}
    </>
  );
}
