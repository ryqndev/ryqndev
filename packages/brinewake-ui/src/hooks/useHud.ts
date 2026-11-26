import { hudSignals, type HudState, hudStore, onHudFrame } from '@ryqndev/brinewake-game';
import type { HudSource } from '@ryqndev/kiln-ui';
import { useStore } from 'zustand';

/** This game's HUD, as kiln-ui's shared components read it. */
export const HUD: HudSource = { store: hudStore, signals: hudSignals, onFrame: onHudFrame };

/** Subscribes a component to one slice of the HUD state. */
export const useHud = <T>(selector: (state: HudState) => T) => useStore(hudStore, selector);
