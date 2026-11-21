import { create } from 'zustand';

interface LoadingStore {
    /** 0-100, mirrors three.js DefaultLoadingManager progress */
    progress: number;
    setProgress: (progress: number) => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
    progress: 0,
    setProgress: (progress) => set({ progress }),
}));
