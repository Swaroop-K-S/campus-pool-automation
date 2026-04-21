import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Cookies are sent automatically with `withCredentials: true`, no need for manual header injection

// Response interceptor handles 401s and generic errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Zero-Drop Offline Resilience
    if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
      if (!originalRequest._isReplay && originalRequest.method?.toLowerCase() !== 'get') {
        try {
          const { useOfflineSyncStore } = await import('../store/offline-sync.store');
          await useOfflineSyncStore.getState().queueHttpAction(originalRequest);
          toast.success('Offline. Action saved and will sync automatically.', { id: 'offline-toast' });
          // Return a pseudo-success so the app doesn't crash visually
          return Promise.resolve({ success: true, cached: true });
        } catch (e) {
          console.error("Failed to queue offline action", e);
        }
      }
      return Promise.reject(error.response?.data || error.message || 'Network Error');
    }

    // Check if error is 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthRoute = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');
      const isOnLoginPage = window.location.pathname === '/login';

      if (!isAuthRoute && !isOnLoginPage) {
        originalRequest._retry = true;
        
        try {
          const { user } = useAuthStore.getState();
          if (user) {
            // Attempt to refresh the token using a raw axios call with credentials
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`, {}, { withCredentials: true });

            if (res.data.success) {
              return axios(originalRequest).then(r => r.data);
            }
          }
        } catch (refreshError) {
          useAuthStore.getState().logout();
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }

        if (useAuthStore.getState().user) {
          useAuthStore.getState().logout();
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);
