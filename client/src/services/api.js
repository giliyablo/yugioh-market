import axios from 'axios';
import { auth } from './firebase';

const localApiUrl = 'http://localhost:5000/api';
const productionApiUrl = 'https://api.tcgsmarketplace.com/api';

// A promise that resolves to the configured axios instance.
// This allows us to perform an async health check before the instance is used.
let apiInstancePromise = null;

function getApi() {
    // If the promise already exists, return it (singleton pattern).
    if (apiInstancePromise) {
        return apiInstancePromise;
    }

    // Otherwise, create the promise. It will check the local server's health
    // and then create the axios instance with the appropriate base URL.
    apiInstancePromise = new Promise(async (resolve) => {
        let baseUrl = productionApiUrl; // Default to production

        // In development, try to connect to the local server.
        const devApiUrl = import.meta.env.VITE_API_URL || localApiUrl;

        if (import.meta.env.DEV) {
            try {
                // Ping the health endpoint with a 2-second timeout.
                await axios.get(`${devApiUrl}/health`, { timeout: 2000 });
                baseUrl = devApiUrl;
                console.log(`✅ Local server is healthy. Using API at ${baseUrl}`);
            } catch (error) {
                console.warn(`⚠️ Local server at ${devApiUrl} not responding. Falling back to production API.`);
                baseUrl = productionApiUrl;
            }
        }

        const api = axios.create({
            baseURL: baseUrl,
        });

        // Interceptor to add the Firebase auth token to every request
        api.interceptors.request.use(
            async (config) => {
                const user = auth.currentUser;
                if (user) {
                    try {
                        const token = await user.getIdToken();
                        config.headers.Authorization = `Bearer ${token}`;
                    } catch (error) {
                        console.error("Error getting user ID token:", error);
                    }
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        resolve(api);
    });

    return apiInstancePromise;
}

// --- Post Functions ---
// Each function now awaits the resolved API instance before making a request.

export const getPosts = async (params) => {
    const api = await getApi();
    return api.get('/', { params });
};

export const getMyPosts = async () => {
    const api = await getApi();
    return api.get('/my-posts');
};

export const createPost = async (postData) => {
    const api = await getApi();
    return api.post('/', postData);
};

export const createBatchPosts = async (formData) => {
    const api = await getApi();
    return api.post('/batch', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const createPostsFromList = async (payload) => {
    const api = await getApi();
    return api.post('/batch-list', payload);
};

export const updatePost = async (id, payload) => {
    const api = await getApi();
    return api.put(`/${id}`, payload);
};

export const deletePost = async (id) => {
    const api = await getApi();
    return api.delete(`/${id}`);
};

export const createPostsFromWhatsapp = async (payload) => {
    const api = await getApi();
    return api.post('/admin/batch-whatsapp', payload);
};
