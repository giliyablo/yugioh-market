import axios from 'axios';
import { auth } from './firebase';

// Set the base URL for your backend server
// In production, this will be set by the deployment environment
// In Docker, this will be the internal service name
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://api.tcgsmarketplace.com/api' : 'https://api.tcgsmarketplace.com/api');

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
export const getPosts = (params) => api.get('/', { params });

// Fetch posts belonging to the current user
export const getMyPosts = () => api.get('/my-posts');

// Create a single new post
export const createPost = (postData) => api.post('/', postData);

// Create multiple posts from a file upload (multipart)
export const createBatchPosts = (formData) => api.post('/batch', formData, {
    headers: {
        'Content-Type': 'multipart/form-data',
    }
});

// Create multiple posts from a list of names
export const createPostsFromList = (payload) => api.post('/batch-list', payload);

// Update an existing post
export const updatePost = (id, payload) => api.put(`/${id}`, payload);

// Delete a post
export const deletePost = (id) => api.delete(`/${id}`);

export default api;

// Create multiple posts from a parsed WhatsApp payload (Admin only)
export const createPostsFromWhatsapp = (payload) => api.post('/admin/batch-whatsapp', payload);
