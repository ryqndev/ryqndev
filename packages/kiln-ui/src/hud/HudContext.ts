import type { FrameListener, HudCore, HudSignals } from '@ryqndev/kiln-core';
import { createContext, useContext } from 'react';
import type { StoreApi } from 'zustand';
import { useStore } from 'zustand';

/**
 * The read side of a game's HUD, as kiln-core's createHud() makes it: the store React subscribes
 * to, the per-frame signals, and the frame tick.
 */
export interface HudSource {
    store: Pick<StoreApi<HudCore>, 'getState' | 'getInitialState' | 'subscribe'>;
    signals: HudSignals;
    onFrame(fn: FrameListener): () => void;
}

/** Set by HudLayer for everything inside it. */
export const HudContext = createContext<HudSource | null>(null);

export function useHudSource(): HudSource {
    const hud = useContext(HudContext);
    if (!hud) throw new Error('kiln-ui: this component must be rendered inside a HudLayer');
    return hud;
}

/** Subscribes a component to one slice of the HUD state every game has. */
export const useHudCore = <T>(selector: (state: HudCore) => T) => useStore(useHudSource().store, selector);
