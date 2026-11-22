import type { World } from './types';

/** The level: colliders, lights, objectives. Filled in by buildWorld(). */
export const W: World = { cols: [], lights: [], glows: [], pylons: [], spawns: [], heart: null!, mesh: null!, PYHP: 900 };
