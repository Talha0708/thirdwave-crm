import axios from 'axios';

// ── 1. Base Axios Instance Setup ────────────────────────────
const api = axios.create({
    // ✅ FIX: হার্ডকোডেড লিংকের বদলে এনভায়রনমেন্ট ভেরিয়েবল ব্যবহার করা হলো। 
    // প্রোডাকশনে স্কেল করার জন্য এটি বেস্ট প্র্যাকটিস।
    baseURL: import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api', 
    timeout: 20000, // ✅ FIX: AI রেসপন্স জেনারেট হতে মাঝেমাঝে সময় লাগে, তাই টাইমআউট 15s থেকে 20s করা হলো
});

// ── 2. Request Interceptor: Attach JWT Token ────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── 3. Response Interceptor: Global Error Handling ──────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // ১. Session Expired (401 Unauthorized)
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            if (window.location.pathname !== '/auth') {
                window.location.replace('/auth');
            }
        }

        // ২. Timeout Error
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            error.response = {
                data: { error: 'Request timed out. Please check your internet connection and try again.' },
            };
        }

        // ৩. Network Error (CORS বা ইন্টারনেট না থাকলে)
        if (!error.response) {
            error.response = {
                data: { error: 'Network error. Cannot reach the Thirdwave server.' },
            };
        }

        return Promise.reject(error);
    }
);

export default api;