import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  contextDriveId: string | null;
  setContextDriveId: (driveId: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      contextDriveId: null,
      setContextDriveId: (contextDriveId) => set({ contextDriveId })
    }),
    { name: 'campuspool-app' }
  )
);
