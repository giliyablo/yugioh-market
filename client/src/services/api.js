import axios from 'axios';
import { auth } from './firebase';

// Set the base URL for your backend server
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor to add the Firebase auth token to every request
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Post Functions ---
export const getPosts = () => api.get('/posts');
export const createPost = (postData) => api.post('/posts', postData);
export const createBatchPosts = (formData) => api.post('/posts/batch', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  }
});

export default api;
