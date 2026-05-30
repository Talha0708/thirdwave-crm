import axios from 'axios';

// ── 1. Base Axios Instance Setup ────────────────────────────
const api = axios.create({
    // VITE_API_URL এর ঝামেলা বাদ দিয়ে সরাসরি ব্যাকএন্ড লিংক দিয়ে দিলাম
    baseURL: 'https://thirdwave-crm.vercel.app/api', 
    timeout: 15_000,
});

// ... (নিচের বাকি কোডগুলো আগের মতোই থাকবে)

// ── 2. Request Interceptor: Attach JWT Token ────────────────
// প্রতিটা এপিআই কলের সাথে লোকাল স্টোরেজ থেকে টোকেন নিয়ে হেডারে পাঠানো হচ্ছে
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        
        // ✅ FIX: টোকেনের সাথে ব্যাকটিক (``) ব্যবহার করা হয়েছে
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// ── 3. Response Interceptor: Global Error Handling ──────────
// যেকোনো এপিআই কল ফেইল করলে সেটা গ্লোবালি এখানে ধরা পড়বে
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // ১. Session Expired (401 Unauthorized)
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // যদি ইউজার অলরেডি লগইন পেজে না থাকে, তবে তাকে রিডাইরেক্ট করে লগইন পেজে পাঠাবে
            if (window.location.pathname !== '/auth') {
                window.location.replace('/auth');
            }
        }

        // ২. Timeout Error (15 সেকেন্ডের বেশি সময় লাগলে)
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            error.response = {
                data: { error: 'Request timed out. Please check your internet connection and try again.' },
            };
        }

        // ৩. Network Error (সার্ভার ডাউন বা ইউজারের ইন্টারনেট না থাকলে)
        if (!error.response) {
            error.response = {
                data: { error: 'Network error. Cannot reach the Thirdwave server.' },
            };
        }

        return Promise.reject(error);
    }
);

export default api;