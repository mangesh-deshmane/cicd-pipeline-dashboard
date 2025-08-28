import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      // Redirect to login if needed
    }
    return Promise.reject(error);
  }
);

// API functions
export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const metricsApi = {
  getProjectMetrics: (projectId, period = '7d') => 
    api.get(`/metrics/projects/${projectId}?period=${period}`),
  getOverview: (period = '7d') => 
    api.get(`/metrics/overview?period=${period}`),
};

export const executionsApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/executions?${queryString}`);
  },
  getById: (id) => api.get(`/executions/${id}`),
  create: (data) => api.post('/executions', data),
  update: (id, data) => api.put(`/executions/${id}`, data),
  getLogs: (id, stepId = null) => {
    const params = stepId ? `?step_id=${stepId}` : '';
    return api.get(`/executions/${id}/logs${params}`);
  },
  retry: (id, data = {}) => api.post(`/executions/${id}/retry`, data),
};

export const alertsApi = {
  getConfigs: (projectId = null) => {
    const params = projectId ? `?project_id=${projectId}` : '';
    return api.get(`/alerts/configs${params}`);
  },
  getConfigById: (id) => api.get(`/alerts/configs/${id}`),
  createConfig: (data) => api.post('/alerts/configs', data),
  updateConfig: (id, data) => api.put(`/alerts/configs/${id}`, data),
  deleteConfig: (id) => api.delete(`/alerts/configs/${id}`),
  getHistory: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/alerts/history?${queryString}`);
  },
  sendTest: (data) => api.post('/alerts/test', data),
  getStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/alerts/stats?${queryString}`);
  },
};

export const webhooksApi = {
  test: (data) => api.post('/webhooks/test', data),
};

// Utility functions
export const handleApiError = (error) => {
  const message = error.response?.data?.error || error.message || 'An error occurred';
  const status = error.response?.status;
  
  return {
    message,
    status,
    details: error.response?.data,
  };
};

export const formatApiResponse = (response) => {
  return response.data;
};

// Health check
export const healthCheck = () => api.get('/health', { baseURL: API_BASE_URL.replace('/api/v1', '') });

export default api;
