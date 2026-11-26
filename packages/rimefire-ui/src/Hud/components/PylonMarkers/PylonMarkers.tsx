import { type PinMargins, pinToScreen, useHudFrame } from '@ryqndev/kiln-ui';
import { hudSignals, MARKER_STRIDE } from '@ryqndev/rimefire-game';
import { memo, useRef } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './PylonMarkers.module.scss';

interface PylonMarkersProps {
    /** HUD zoom factor: marker positions are computed in viewport pixels and must be un-scaled */
    zoom: number;
}

// keep markers clear of the screen edges and the HUD panels
const MARGINS: PinMargins = { x: 40, top: 70, bottom: 120 };

/** Waypoints pinned to the frozen pylons, with distance and thaw progress. */
export const PylonMarkers = memo(function PylonMarkers({ zoom }: PylonMarkersProps) {
    const pylons = useHud((s) => s.pylons);
    const markers = useRef<(HTMLDivElement | null)[]>([]);

    // world-anchored, so they move every frame: positioned straight on the DOM instead of through state
    useHudFrame(() => {
        const screen = hudSignals.markers;
        for (let i = 0; i < markers.current.length; i++) {
            const el = markers.current[i];
            if (!el) continue;
            const o = i * MARKER_STRIDE;
            pinToScreen(el, screen[o], screen[o + 1], !!screen[o + 2], zoom, MARGINS);
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
