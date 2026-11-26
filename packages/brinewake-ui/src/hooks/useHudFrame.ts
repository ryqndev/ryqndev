import { onHudFrame } from '@ryqndev/brinewake-game';
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Runs a callback on every game frame, outside of React rendering. Use it for values that change
 * each frame (opacity fades, world-anchored markers) and write to the DOM through refs.
 */
export function useHudFrame(callback: (dt: number) => void) {
    const latest = useRef(callback);
    useLayoutEffect(() => {
        latest.current = callback;
    });
    useEffect(() => onHudFrame((dt) => latest.current(dt)), []);
}
