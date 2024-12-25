/**
 * @author Ryan Yang
 * https://github.com/ryqndev
 */
import { useCallback, useEffect, useState } from 'react';
import lightTheme from '@assets/themes/light.json';
import darkTheme from '@assets/themes/dark.json';
import { Theme } from './types';

export const themes = [lightTheme, darkTheme];

const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(
        (localStorage.getItem('theme') as Theme | null) ?? Theme.DARK
    );

    useEffect(() => {
        localStorage.setItem('theme', JSON.stringify(theme));

        let styles = themes[theme].themeStyles;
        for (let style in styles) {
            document.documentElement.style.setProperty(style, styles[style]);
        }
    }, [theme]);

    const toggle = useCallback(() => setTheme((prev) => (prev + 1) % 2), []);

    return {
        theme,
        toggle,
    };
};

export default useTheme;
