import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor opens header to insert auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor handles 401s and generic errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh')) {
        originalRequest._retry = true;
        
        try {
          const { refreshToken, user } = useAuthStore.getState();
          if (refreshToken && user) {
            // Attempt to refresh the token using a raw axios call to avoid interceptor loops
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`, {
              refreshToken
            });

            if (res.data.success) {
              const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
              
              // Update the store
              useAuthStore.getState().setAuth(user, newAccess, newRefresh || refreshToken);
              
              // Update the original request with the new token and retry it!
              originalRequest.headers.Authorization = `Bearer ${newAccess}`;
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

        // If no refresh token or refresh failed silently
        useAuthStore.getState().logout();
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);
