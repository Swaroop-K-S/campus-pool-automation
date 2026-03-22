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
    // Check if error is 401 Unauthorized
    if (error.response?.status === 401) {
      // Very basic interceptor: clear store & redirect to login (unless already logging in)
      if (!error.config.url?.includes('/auth/login')) {
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
