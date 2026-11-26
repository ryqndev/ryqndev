import { useEffect, useLayoutEffect, useRef } from 'react';

import { useHudSource } from './HudContext';

/**
 * Runs a callback on every game frame, outside of React rendering. Use it for values that change
 * each frame (opacity fades, world-anchored markers) and write to the DOM through refs.
 */
export function useHudFrame(callback: (dt: number) => void) {
    const hud = useHudSource();
    const latest = useRef(callback);
    useLayoutEffect(() => {
        latest.current = callback;
    });
    useEffect(() => hud.onFrame((dt) => latest.current(dt)), [hud]);
}
