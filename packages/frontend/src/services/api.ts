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
              // The backend automatically overrides the old cookies with the new ones
              // Retry the original request
              return axios(originalRequest).then(r => r.data);
            }
          }
        } catch (refreshError) {
          // If refresh fails, log them out
          useAuthStore.getState().logout();
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }

        // If no user in store — don't force redirect, just reject silently
        // (handles the case right after login before the store hydrates)
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
