import { useThemeStore } from 'app/controller/theme/theme.store';
import { memo } from 'react';
import Toggle from 'react-toggle';
import { useShallow } from 'zustand/shallow';

export const ThemeToggleSwitch = memo(() => {
    const { theme, toggle } = useThemeStore(
        useShallow((state) => ({
            toggle: state.toggleTheme,
            theme: state.theme,
        }))
    );

    return (
        <div
            className="t-w"
            data-mouse-hover="button"
            data-mouse-hover-text="toggle theme"
            onClick={toggle}
        >
            <Toggle checked={Boolean(theme)} icons={false} onChange={toggle} />
        </div>
    );
});
