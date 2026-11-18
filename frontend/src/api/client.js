import axios from 'axios';

/** Axios instance pointed at the backend API */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor: normalise error messages
api.interceptors.response.use(
  (response) => response,
  (err) => {
    const message =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

/**
 * Ingest a note or URL into the knowledge base.
 * @param {'note'|'url'} type
 * @param {string} content
 */
export const ingestContent = (type, content) =>
  api.post('/api/ingest', { type, content }).then((r) => r.data);

/**
 * Fetch paginated list of knowledge items.
 * @param {number} limit
 * @param {number} offset
 */
export const fetchItems = (limit = 20, offset = 0) =>
  api.get('/api/items', { params: { limit, offset } }).then((r) => r.data);

/**
 * Ask a question against the knowledge base.
 * @param {string} question
 */
export const askQuestion = (question) =>
  api.post('/api/query', { question }).then((r) => r.data);

/** Health check */
export const checkHealth = () =>
  api.get('/api/health').then((r) => r.data);

export default api;
