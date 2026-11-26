import { HULLS } from '../models';
import { ships } from './state';
import { AI, type Role, type Ship, type ShipType } from './types';

/** Launches a ship and adds it to the world. */
export function makeShip(role: Role, team: number, type: ShipType, x: number, z: number, yaw: number): Ship {
    const s: Ship = {
        role, team, type, hull: HULLS[type.hull], scale: type.scale, x, z, yaw, v: 0, w: 0, y: 0, pitch: 0, roll: 0, sail: 0, canvas: 0, rudder: 0,
        hp: type.hp, max: type.hp, speed: type.speed, turn: type.turn, dmg: type.dmg, reload: type.reload, shot: type.shot,
        rl: [0, 0], vol: [{ t: -1, n: 0, tx: 0, tz: 0 }, { t: -1, n: 0, tx: 0, tz: 0 }], flash: 0, sink: 0, dead: false, hl: 0, hb: 0, br2: 0, loot: type.loot,
        st: AI.CRUISE, think: Math.random() * 0.3, tgt: null, wp: 0, goal: yaw, want: 2, orbit: Math.random() < 0.5 ? 1 : -1, aggro: 0, slot: 0,
        seed: Math.random() * 100, wake: 0, ground: 0,
    };
    measure(s);
    ships.push(s);
    return s;
}

/** Recomputes a ship's collision dimensions from its hull and scale. */
export function measure(s: Ship) {
    s.hl = (s.hull.len * s.scale) / 2;
    s.hb = (s.hull.beam * s.scale) / 2;
    s.br2 = (s.hl + 2) ** 2;
}
