import { useEffect, useRef, useState } from 'react';

/**
 * Throttles `value`: the first change is applied immediately, further changes
 * inside the `delay` window are coalesced and the latest one is applied when
 * the window ends.
 *
 * (The previous implementation scheduled a second, never-cleared timeout that
 * re-applied a stale value after `delay`, so the output could briefly jump
 * backwards.)
 */
export default function useDebounce<T>(value: T, delay = 25) {
    const [throttled, setThrottled] = useState<T>(value);
    const lastApplied = useRef(0);

    useEffect(() => {
        const remaining = lastApplied.current + delay - Date.now();

        if (remaining <= 0) {
            lastApplied.current = Date.now();
            setThrottled(value);
            return;
        }

        const timer = setTimeout(() => {
            lastApplied.current = Date.now();
            setThrottled(value);
        }, remaining);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return throttled;
}
