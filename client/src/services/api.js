const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

/**
 * Make an authenticated API request.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// ─── Auth ──────────────────────────────────────
export async function signup(username, password) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// ─── Tasks ─────────────────────────────────────
export async function getTasks(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/tasks${query ? '?' + query : ''}`);
}

export async function getTodayTasks() {
  return request('/tasks/today');
}

export async function createTask(task) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTask(id, updates) {
  return request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

// ─── Chat / Classify ──────────────────────────
export async function classifyTask(text, imageFile) {
  if (imageFile) {
    const formData = new FormData();
    if (text) formData.append('text', text);
    formData.append('image', imageFile);
    return request('/chat/classify', {
      method: 'POST',
      body: formData,
    });
  }

  return request('/chat/classify', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ─── Notifications ─────────────────────────────
export async function getVapidPublicKey() {
  return request('/notifications/vapid-public-key');
}

export async function subscribePush(subscription) {
  return request('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  });
}

export async function unsubscribePush() {
  return request('/notifications/unsubscribe', {
    method: 'POST',
  });
}
