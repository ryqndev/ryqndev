import { create, StateCreator } from 'zustand';
import { Theme } from './types';
import { persist } from 'zustand/middleware';

import lightTheme from '@assets/themes/light.json';
import darkTheme from '@assets/themes/dark.json';

const THEME_LOCALSTORAGE_ID = '@ryqndev/theme'
export const themes = [lightTheme, darkTheme];


interface ThemeStore {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

type PersistType = StateCreator<ThemeStore, [], [["zustand/persist", ThemeStore]]>;

const renderThemeStyles = (theme: Theme) => {
    let styles = themes[theme].themeStyles;
    for (let style in styles) {
        document.documentElement.style.setProperty(style, styles[style]);
    }
}

/**
 * middleware wrapper that handles the actual theme switch and applies the new css styles
 */
const themeSwitch: (config: PersistType) => PersistType = (config) => (set, get, api) => {
    const wrappedSet: typeof set = (partial, replace) => {
        const prev = get();
        set(partial, replace);
        const next = get();

        if (prev.theme !== next.theme) {
            renderThemeStyles(next.theme);
        }
    };

    const initialState = config(wrappedSet, get, api);

    renderThemeStyles(initialState.theme);

    return initialState;
};


export const useThemeStore = create(themeSwitch(persist<ThemeStore>((set) => ({
    theme: (localStorage.getItem(THEME_LOCALSTORAGE_ID) as Theme | null) ?? Theme.DARK,
    toggleTheme: () =>
        set((state) => ({ theme: (state.theme + 1) % themes.length })),
    setTheme: (theme: Theme) => set({ theme }),
}), {
    name: THEME_LOCALSTORAGE_ID,
})));



