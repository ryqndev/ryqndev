import clsx from 'clsx';
import { memo, type ReactNode } from 'react';
import { useStore } from 'zustand';

import { HudContext, type HudSource } from '../hud/HudContext';
import cn from './HudLayer.module.scss';

interface HudLayerProps {
    hud: HudSource;
    /** UI scale, from useViewportZoom() */
    zoom: number;
    /** modes the HUD shows in: by default while playing and, dimmed by the overlay, while paused */
    showIn?: readonly string[];
    children: ReactNode;
}

const PLAYING = ['play', 'pause'];

/** The in-game heads-up display's root. Everything inside it can read the game's HUD. */
export const HudLayer = memo(function HudLayer({ hud, zoom, showIn = PLAYING, children }: HudLayerProps) {
    const visible = useStore(hud.store, (s) => showIn.includes(s.mode));

    return (
        <HudContext value={hud}>
            <div className={clsx(cn.hud, visible && cn.on)} style={{ zoom }}>
                {children}
            </div>
        </HudContext>
    );
});
