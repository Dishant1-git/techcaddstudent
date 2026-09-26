const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type for FormData uploads so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // If 401 Unauthorized, clear stale token
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new Event('auth-expired'));
      }
      const err = new Error(data.message || `Request failed with status ${response.status}`);
      err.status = response.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  registerStudent: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  changeCredentials: (data) => request('/auth/change-credentials', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updatePassword: (data) => request('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Students
  getStudents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/students${query ? `?${query}` : ''}`);
  },
  getStudentMe: () => request('/students/me'),
  getStudent: (id) => request(`/students/${id}`),
  createStudent: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approveStudent: (id) => request(`/students/${id}/approve`, { method: 'POST' }),
  rejectStudent: (id, reason) => request(`/students/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),

  // Trainers
  getTrainers: () => request('/trainers'),
  getTrainerMe: () => request('/trainers/me'),
  getTrainer: (id) => request(`/trainers/${id}`),
  createTrainer: (data) => request('/trainers', { method: 'POST', body: JSON.stringify(data) }),
  updateTrainer: (id, data) => request(`/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrainer: (id) => request(`/trainers/${id}`, { method: 'DELETE' }),

  // Courses & Batches
  getCourses: () => request('/courses'),
  getCourse: (id) => request(`/courses/${id}`),
  createCourse: (data) => request('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id, data) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),

  getBatches: () => request('/batches'),
  getBatch: (id) => request(`/batches/${id}`),
  createBatch: (data) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id, data) => request(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBatch: (id) => request(`/batches/${id}`, { method: 'DELETE' }),

  // Attendance
  markAttendance: (data) => request('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
  getMyAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/my${query ? `?${query}` : ''}`);
  },
  getTrainerPendingAttendance: () => request('/attendance/trainer/pending'),
  getTrainerAllAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/trainer/all${query ? `?${query}` : ''}`);
  },
  verifyAttendance: (id) => request(`/attendance/verify/${id}`, { method: 'POST' }),
  rejectAttendance: (id, reason) => request(`/attendance/reject/${id}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getAdminAllAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/admin/all${query ? `?${query}` : ''}`);
  },
  getAttendanceReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/reports${query ? `?${query}` : ''}`);
  },

  // Complaints
  submitComplaint: (data) => request('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  getMyComplaints: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/complaints/my${query ? `?${query}` : ''}`);
  },
  getAdminAllComplaints: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/complaints/admin/all${query ? `?${query}` : ''}`);
  },
  getAdminComplaint: (id) => request(`/complaints/admin/${id}`),
  updateComplaintStatus: (id, data) => request(`/complaints/admin/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  broadcastNotification: (data) => request('/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getAdminAnalytics: () => request('/analytics/admin'),
  getTrainerAnalytics: () => request('/analytics/trainer'),
  getStudentAnalytics: () => request('/analytics/student'),

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit-logs${query ? `?${query}` : ''}`);
  },

  // Uploads
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/uploads', { method: 'POST', body: formData });
  }
};
