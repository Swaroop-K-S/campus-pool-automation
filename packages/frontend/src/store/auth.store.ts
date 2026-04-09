import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface AuthUser {
  userId: string;
  collegeId: string;
  name?: string;
  email?: string;
  role?: string;
}

interface AuthState {
  user: AuthUser | null;
  
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      
      setUser: (user) => set({ user }),
      
      logout: () => {
        // Send a request to the backend to clear the HttpOnly cookies
        api.post('/auth/logout').catch(() => null);
        set({ user: null });
      }
    }),
    {
      name: 'campuspool-auth',
      partialize: (state) => ({ user: state.user }), // only persist user
    }
  )
);
