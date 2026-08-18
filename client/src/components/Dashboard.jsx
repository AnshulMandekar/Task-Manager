import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodayTasks, getTasks } from '../services/api';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import NotificationPrompt from './NotificationPrompt';

export default function Dashboard() {
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState([]);
  const [allPending, setAllPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [today, all] = await Promise.all([
        getTodayTasks(),
        getTasks({ status: 'pending' }),
      ]);
      setTodayTasks(today);
      setAllPending(all);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Stats
  const collegeTasks = allPending.filter(t => t.category === 'College').length;
  const jobTasks = allPending.filter(t => t.category === 'Job').length;
  const studyTasks = allPending.filter(t => t.category === 'Study').length;

  function handleEdit(task) {
    setEditingTask(task);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingTask(null);
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-greeting">
        <h1>{greeting}, {user?.username} 👋</h1>
        <div className="date-text">{dateStr}</div>
      </div>

      <NotificationPrompt />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{allPending.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card college">
          <div className="stat-number">{collegeTasks}</div>
          <div className="stat-label">College</div>
        </div>
        <div className="stat-card job">
          <div className="stat-number">{jobTasks}</div>
          <div className="stat-label">Job</div>
        </div>
        <div className="stat-card study">
          <div className="stat-number">{studyTasks}</div>
          <div className="stat-label">Study</div>
        </div>
      </div>

      <div className="section-title">
        Due Today
        <span className="count">{todayTasks.length}</span>
      </div>

      {todayTasks.length > 0 ? (
        <div className="task-list">
          {todayTasks.map((task, i) => (
            <TaskCard
              key={task._id}
              task={task}
              onUpdate={fetchData}
              onDelete={fetchData}
              onEdit={handleEdit}
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <h3>Nothing due today!</h3>
          <p>Enjoy your free time, or add a new task to get ahead.</p>
        </div>
      )}

      {allPending.length > 0 && todayTasks.length < allPending.length && (
        <>
          <div className="section-title" style={{ marginTop: 32 }}>
            All Pending
            <span className="count">{allPending.length}</span>
          </div>
          <div className="task-list">
            {allPending
              .filter(t => !todayTasks.find(tt => tt._id === t._id))
              .slice(0, 10)
              .map((task, i) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onUpdate={fetchData}
                  onDelete={fetchData}
                  onEdit={handleEdit}
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
          </div>
        </>
      )}

      <button
        className="fab"
        onClick={() => setShowModal(true)}
        aria-label="Add new task"
        id="add-task-fab"
      >
        +
      </button>

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={handleCloseModal}
          onSaved={fetchData}
        />
      )}
    </>
  );
}
