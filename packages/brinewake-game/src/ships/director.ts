import { sfx } from '@ryqndev/brinewake-audio';
import { rnd, TAU } from '@ryqndev/kiln-math';

import { hud } from '../hud';
import { S } from '../state';
import { openWater, W } from '../world';
import { FOES, infamyOf } from './defs';
import { makeShip } from './spawn';
import { D, ships } from './state';
import { type Role, type Ship, type ShipType, TEAM } from './types';

/** What the navy calls the player at each level of infamy. */
const TITLES = ['', 'A KNOWN RAIDER', 'WANTED', 'SCOURGE OF THE LANES', 'ENEMY OF THE CROWN', 'THE ADMIRAL SAILS'];
/** Nothing is launched closer to the player than this, metres: far enough to be lost in the haze. */
const OVER_HORIZON = 400;

// a route waypoint out of the player's sight
function lane(p: Ship): number {
    let best = 0,
        score = -1;
    for (let k = 0; k < 8; k++) {
        const i = (Math.random() * W.routes.length) | 0,
            d = Math.hypot(W.routes[i][0] - p.x, W.routes[i][1] - p.z),
            sc = d > OVER_HORIZON ? 1000 + Math.random() : d;
        if (sc > score) {
            score = sc;
            best = i;
        }
    }
    return best;
}

function launch(role: Role, type: ShipType, p: Ship, level: number): Ship {
    const wp = lane(p),
        [x, z] = W.routes[wp],
        s = makeShip(role, role === 'trader' ? TEAM.TRADE : TEAM.NAVY, type, x + rnd(-25, 25), z + rnd(-25, 25), rnd(TAU));
    s.wp = wp;
    s.sail = s.want = 2;
    s.v = s.speed * 0.5;
    s.canvas = 0.66;
    // the navy sends better ships after a worse pirate
    if (s.team === TEAM.NAVY) s.hp = s.max = type.hp * (1 + level * 0.07);
    return s;
}

// hunters come in from open water on a random bearing, already making for the player
function launchHunter(type: ShipType, p: Ship, level: number, role: Role = 'hunter'): Ship {
    const s = launch(role, type, p, level);
    for (let k = 0; k < 16; k++) {
        const a = rnd(TAU),
            d = rnd(OVER_HORIZON + 40, OVER_HORIZON + 160),
            x = p.x + Math.cos(a) * d,
            z = p.z + Math.sin(a) * d;
        if (!openWater(x, z, 50, 8)) continue;
        s.x = x;
        s.z = z;
        break;
    }
    s.yaw = s.goal = Math.atan2(s.x - p.x, s.z - p.z);
    s.sail = s.want = 3;
    return s;
}

/** Puts the opening traffic on the sea lanes. */
export function resetDirector(p: Ship) {
    const level = infamyOf(S.prog.renown);
    Object.assign(D, { spawnT: 3, huntT: 70, flagship: null, level });
    for (let i = 0; i < 4; i++) launch('trader', FOES.trader, p, level);
    launch('patrol', FOES.cutter, p, level);
}

/** Decides who is at sea: merchant traffic, patrols, and hunters and at last the flagship as the player's infamy grows. */
export function director(dt: number, p: Ship) {
    const level = infamyOf(S.prog.renown);
    if (level > D.level) {
        D.level = level;
        hud.banner(TITLES[level], level < 5 ? 'the price on your head grows' : 'the fleet is coming for you');
        sfx.horn();
    }
    if ((D.spawnT -= dt) <= 0) {
        D.spawnT = 3;
        let traders = 0,
            patrols = 0,
            prize = false;
        for (const s of ships) {
            if (s.dead) continue;
            if (s.role === 'trader') {
                traders++;
                prize ||= s.type === FOES.treasure;
            } else if (s.role === 'patrol') patrols++;
        }
        if (traders < 4 + (level >= 3 ? 1 : 0)) launch('trader', level >= 2 && !prize && Math.random() < 0.4 ? FOES.treasure : FOES.trader, p, level);
        else if (patrols < 1 + ((level + 1) >> 1)) launch('patrol', level >= 3 && Math.random() < 0.4 ? FOES.frigate : FOES.cutter, p, level);
    }
    // from "wanted" on, the navy stops waiting to stumble across the player
    if (level >= 2 && !D.flagship && (D.huntT -= dt) <= 0) {
        D.huntT = rnd(85, 120) - level * 9;
        let hunters = 0;
        for (const s of ships) if (s.role === 'hunter' && !s.dead) hunters++;
        if (hunters < (level >= 4 ? 2 : 1)) {
            launchHunter(level >= 3 && Math.random() < 0.5 ? FOES.frigate : FOES.cutter, p, level);
            if (level >= 4) launchHunter(FOES.cutter, p, level);
            hud.toast('Navy hunters have picked up your wake');
        }
    }
    // at the top of the list the admiral comes out himself, once
    if (level >= 5 && !D.flagship && !S.prog.won) {
        D.flagship = launchHunter(FOES.flagship, p, 0, 'flagship');
        launchHunter(FOES.cutter, p, level);
        launchHunter(FOES.cutter, p, level);
    }
}
