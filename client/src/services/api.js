import axios from 'axios';
import { auth } from './firebase';

// Set the base URL for your backend server
// In production, this will be set by the deployment environment
// In Docker, this will be the internal service name
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'http://server:80/api' : 'http://localhost:80/api');

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

// Fetch all active posts with optional filters/pagination
export const getPosts = (params) => api.get('/posts', { params });

// Fetch posts belonging to the current user
export const getMyPosts = () => api.get('/posts/my-posts');

// Create a single new post
export const createPost = (postData) => api.post('/posts', postData);

// Create multiple posts from a file upload (multipart)
export const createBatchPosts = (formData) => api.post('/posts/batch', formData, {
    headers: {
        'Content-Type': 'multipart/form-data',
    }
});

// Create multiple posts from a list of names
export const createPostsFromList = (payload) => api.post('/posts/batch-list', payload);

// Update an existing post
export const updatePost = (id, payload) => api.put(`/posts/${id}`, payload);

// Delete a post
export const deletePost = (id) => api.delete(`/posts/${id}`);

export default api;
