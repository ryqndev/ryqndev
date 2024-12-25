import { create } from 'zustand';
import { Theme } from './types';
import { themes } from './useTheme';

interface ThemeStore {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
    theme: 0,
    toggleTheme: () =>
        set((state) => ({ theme: (state.theme + 1) % themes.length })),
    setTheme: (theme: Theme) => set({ theme }),
}));
