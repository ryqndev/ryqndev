import { hudSignals } from '@ryqndev/brinewake-game';
import { memo, useRef } from 'react';

import { useHudFrame } from '../../../hooks/useHudFrame';
import cn from './PortMarker.module.scss';

interface PortMarkerProps {
    /** HUD zoom factor: marker positions are computed in viewport pixels and must be un-scaled */
    zoom: number;
}

// keep the marker clear of the screen edges and the HUD panels
const MARGIN_X = 40;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 190;
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
        const w = window.innerWidth,
            h = window.innerHeight,
            [sx, sy, front, metres] = hudSignals.home;
        el.style.opacity = metres < HIDE_WITHIN ? '0' : '0.9';
        let x = sx * w,
            y = sy * h;
        if (!front) {
            // behind the camera: mirror it and pin it low, pointing the way to turn
            x = w - x;
            y = h - 60;
        }
        x = Math.max(MARGIN_X, Math.min(w - MARGIN_X, x));
        y = Math.max(MARGIN_TOP, Math.min(h - MARGIN_BOTTOM, y));
        el.style.transform = `translate(${(x / zoom) | 0}px,${(y / zoom) | 0}px)`;
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
