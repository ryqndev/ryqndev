import { type HudState, hudStore } from '@ryqndev/brinewake-game';
import { useStore } from 'zustand';

/** Subscribes a component to one slice of the HUD state. */
export const useHud = <T>(selector: (state: HudState) => T) => useStore(hudStore, selector);
