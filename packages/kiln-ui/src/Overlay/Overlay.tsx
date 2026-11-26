import clsx from 'clsx';
import { Fragment, memo, type ReactNode, useState } from 'react';
import { useStore } from 'zustand';

import type { HudSource } from '../hud/HudContext';
import { useViewportZoom } from '../hud/useViewportZoom';
import cn from './Overlay.module.scss';

interface OverlayProps {
    hud: HudSource;
    /**
     * What to show in each mode, by mode name. The overlay is out of the way in every mode left
     * out. Inside a screen, h1 is the game's name, h2 a headline and p a line of small print.
     */
    screens: Partial<Record<string, ReactNode>>;
    /** A click anywhere on the overlay: start or resume play. */
    onBegin(): void;
}

/** Full-screen menus: title, pause, end of run. Fades out over the game when play starts. */
export const Overlay = memo(function Overlay({ hud, screens, onBegin }: OverlayProps) {
    const mode = useStore(hud.store, (s) => s.mode);
    const zoom = useViewportZoom();
    const off = screens[mode] === undefined;
    // keep showing the last screen while the overlay fades out into play
    const [screen, setScreen] = useState(mode);
    if (!off && mode !== screen) setScreen(mode);

    return (
        <div className={clsx(cn.overlay, off && cn.off)} style={{ zoom }} onClick={onBegin}>
            {/* keyed, so each screen mounts afresh and its animations start from the top */}
            <Fragment key={screen}>{screens[screen]}</Fragment>
        </div>
    );
});

/** The pulsing call to action at the foot of a screen ("CLICK TO RESUME"). */
export const OverlayPrompt = ({ children }: { children: ReactNode }) => <div className={cn.prompt}>{children}</div>;

/** Small print pinned to the bottom edge. */
export const OverlayFootnote = ({ children }: { children: ReactNode }) => <div className={cn.footnote}>{children}</div>;

/** A plain message in place of a screen, for when the game cannot run. */
export const OverlayNotice = ({ children }: { children: ReactNode }) => <p className={cn.notice}>{children}</p>;
