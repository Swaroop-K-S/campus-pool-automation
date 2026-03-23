import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  userId: string;
  collegeId: string;
  name?: string;
  email?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      
      logout: () => {
        fetch('http://localhost:5000/api/v1/auth/logout', { 
           method: 'POST',
           headers: { 'Authorization': `Bearer ${useAuthStore.getState().accessToken}` }
        }).catch(() => null);
        
        set({ user: null, accessToken: null, refreshToken: null });
      }
    }),
    {
      name: 'campuspool-auth',
    }
  )
);
