import { hudSignals } from '@ryqndev/brinewake-game';
import { type PinMargins, pinToScreen, useHudFrame } from '@ryqndev/kiln-ui';
import { memo, useRef } from 'react';

import cn from './PortMarker.module.scss';

interface PortMarkerProps {
    /** HUD zoom factor: marker positions are computed in viewport pixels and must be un-scaled */
    zoom: number;
}

// keep the marker clear of the screen edges and the HUD panels
const MARGINS: PinMargins = { x: 40, top: 70, bottom: 190 };
/** Inside the anchorage the pier is in plain sight; the waypoint only clutters. Metres. */
const HIDE_WITHIN = 90;

/** Waypoint pinned to the home port, with the distance left to run. */
export const PortMarker = memo(function PortMarker({ zoom }: PortMarkerProps) {
    const marker = useRef<HTMLDivElement>(null);
    const distance = useRef<HTMLDivElement>(null);
    const shown = useRef(-1);

    // world-anchored, so it moves every frame: positioned straight on the DOM instead of through state
    useHudFrame(() => {
        const el = marker.current;
        if (!el) return;
        const [sx, sy, front, metres] = hudSignals.home;
        el.style.opacity = metres < HIDE_WITHIN ? '0' : '0.9';
        pinToScreen(el, sx, sy, !!front, zoom, MARGINS);
        // the readout changes in ten-metre steps, so its text is rewritten only now and then
        const tens = Math.round(metres / 10) * 10;
        if (distance.current && tens !== shown.current) distance.current.textContent = (shown.current = tens) + 'm';
    });

    return (
        <div className={cn.marker} ref={marker}>
            <i className={cn.anchor}>⚓</i>
            <div className={cn.distance} ref={distance} />
        </div>
    );
});
