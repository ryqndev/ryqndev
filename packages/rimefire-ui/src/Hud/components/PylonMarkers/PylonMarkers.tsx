import { hudSignals, MARKER_STRIDE } from '@ryqndev/rimefire-game';
import { memo, useRef } from 'react';

import { useHud } from '../../../hooks/useHud';
import { useHudFrame } from '../../../hooks/useHudFrame';
import cn from './PylonMarkers.module.scss';

interface PylonMarkersProps {
    /** HUD zoom factor: marker positions are computed in viewport pixels and must be un-scaled */
    zoom: number;
}

// keep markers clear of the screen edges and the HUD panels
const MARGIN_X = 40;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 120;

/** Waypoints pinned to the frozen pylons, with distance and thaw progress. */
export const PylonMarkers = memo(function PylonMarkers({ zoom }: PylonMarkersProps) {
    const pylons = useHud((s) => s.pylons);
    const markers = useRef<(HTMLDivElement | null)[]>([]);

    // world-anchored, so they move every frame: positioned straight on the DOM instead of through state
    useHudFrame(() => {
        const w = window.innerWidth,
            h = window.innerHeight,
            screen = hudSignals.markers;
        for (let i = 0; i < markers.current.length; i++) {
            const el = markers.current[i];
            if (!el) continue;
            const o = i * MARKER_STRIDE;
            let x = screen[o] * w,
                y = screen[o + 1] * h;
            if (!screen[o + 2]) {
                // behind the camera: mirror it and pin it low, pointing the way to turn
                x = w - x;
                y = h - 60;
            }
            x = Math.max(MARGIN_X, Math.min(w - MARGIN_X, x));
            y = Math.max(MARGIN_TOP, Math.min(h - MARGIN_BOTTOM, y));
            el.style.transform = `translate(${(x / zoom) | 0}px,${(y / zoom) | 0}px)`;
        }
    });

    return (
        <>
            {pylons.map((pylon, i) =>
                pylon.lit ? null : (
                    <div
                        className={cn.marker}
                        key={i}
                        ref={(el) => {
                            markers.current[i] = el;
                        }}
                    >
                        <i className={cn.diamond} />
                        <div className={cn.progress}>
                            <div className={cn.fill} style={{ transform: `scaleX(${pylon.progress / 20})` }} />
                        </div>
                        <div className={cn.distance}>{pylon.dist}m</div>
                    </div>
                )
            )}
        </>
    );
});
