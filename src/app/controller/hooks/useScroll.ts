import { create } from 'zustand';

interface ScrollStore {
    y: number;
}

const useScrollStore = create<ScrollStore>(() => ({ y: window.scrollY }));

// One passive, rAF-throttled scroll listener for the whole app, attached on
// first use. Previously every component that called useScroll() attached its
// own listener and ran its own debounce.
let listening = false;
let frame = 0;

const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        useScrollStore.setState({ y: window.scrollY });
    });
};

const ensureListener = () => {
    if (listening) return;
    listening = true;
    window.addEventListener('scroll', onScroll, { passive: true });
};

/** Re-read window.scrollY now (e.g. after layout the selector depends on exists). */
export const refreshScroll = () => useScrollStore.setState({ y: window.scrollY });

/**
 * Current window.scrollY, updated at most once per frame.
 *
 * Pass a selector to derive a value (a threshold boolean, an index) so the
 * calling component only re-renders when that derived value changes rather
 * than on every scroll frame.
 */
export function useScroll(): number;
export function useScroll<T>(selector: (y: number) => T): T;
export function useScroll<T>(
    selector: (y: number) => T = (y) => y as unknown as T
): T {
    ensureListener();
    return useScrollStore((state) => selector(state.y));
}
