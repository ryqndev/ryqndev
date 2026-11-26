import { sfx } from '@ryqndev/brinewake-audio';

import { hullModel, sigilMesh } from './models';
import { saveProgress } from './save';
import { reloadGuns } from './ships/battery';
import { aboard, type Station, TAVERN_SIZE, tavernful, withPost } from './ships/crew';
import { CLASS_COST, CLASSES, ESCORT, ESCORT_COST, infamyOf, MAX_ESCORTS, maxLevel, UP, upgradeCost, UPGRADES } from './ships/defs';
import { berthsOf, type Build, fitting, holdOf, KIND, levelOf, shipStats, type Slot } from './ships/fittings';
import { makeShip, measure } from './ships/spawn';
import { ships } from './ships/state';
import { type Ship, TEAM } from './ships/types';
import { PL, S } from './state';

/** The most plunder the player's hold takes, in gold. */
export const holdCap = () => holdOf(S.prog);

/**
 * Rebuilds the player's ship to a build: by default the one they own and have fitted. She comes
 * out fully repaired, and her consorts take her colours.
 */
export function refit(s: Ship, build: Build = S.prog) {
    const c = CLASSES[build.cls],
        st = shipStats(build);
    s.type = c;
    s.hull = hullModel(c.hull, levelOf(build, UP.GUNDECK), levelOf(build, UP.QUARTERS), st.skin, st.form);
    s.scale = c.scale;
    measure(s);
    s.max = s.hp = st.hp;
    s.speed = st.speed;
    s.turn = st.turn;
    s.mend = st.mend;
    s.bat[0].gun = st.bat[0];
    s.bat[1].gun = st.bat[1];
    s.paint = st.paint;
    s.cloth = st.cloth;
    s.sigil = sigilMesh(st.sigil, st.gilt);
    s.ink = st.ink;
    reloadGuns(s);
    for (const e of ships) if (e.role === 'escort') fly(e, s);
}

// a consort sails under the colours and the sigil of the ship she follows
function fly(e: Ship, lead: Ship) {
    e.paint = lead.paint;
    e.cloth = lead.cloth;
    e.sigil = lead.sigil;
    e.ink = lead.ink;
}

/** Launches a hired consort astern of the player, in formation slot `slot`. */
export function launchEscort(slot: number) {
    const p = PL.ship,
        side = slot ? 1 : -1,
        back = p.hl + 26,
        e = makeShip('escort', TEAM.PIRATE, ESCORT, p.x + Math.cos(p.yaw) * side * 26 + Math.sin(p.yaw) * back, p.z - Math.sin(p.yaw) * side * 26 + Math.cos(p.yaw) * back, p.yaw);
    e.slot = slot;
    e.want = 0;
    fly(e, p);
}

// takes payment if the player is in port and can afford it
function pay(cost: number): boolean {
    if (S.mode !== 'port' || S.prog.gold < cost) {
        sfx.deny();
        return false;
    }
    S.prog.gold -= cost;
    if (cost > 0) sfx.buy();
    else sfx.ui();
    return true;
}

// ---- trying a build on: the yard shows the ship as she would be before anything is paid for ----
let trying = false;

/**
 * Shows the player's ship as a build would make her, without buying anything: what the shipyard
 * does while an offer is being looked at. Null puts her back as she really is.
 */
export function previewBuild(build: Build | null) {
    if (S.mode !== 'port' || (!build && !trying)) return;
    if (build && !(CLASSES[build.cls] && build.levels.length >= UPGRADES.length && Array.isArray(build.crew))) return;
    refit(PL.ship, build ?? S.prog);
    trying = !!build;
}

// the build changed for real: the ship is rebuilt to it and the save written
function commit() {
    trying = false;
    // a ship with fewer berths than before puts the last to join back ashore
    const prog = S.prog,
        berthed = aboard(prog.crew, berthsOf(prog));
    for (const s of prog.crew) if (s.post && !berthed.includes(s)) s.post = null;
    refit(PL.ship);
    saveProgress();
}

/** Buys the next level of an improvement (index into UPGRADES). */
export function buyUpgrade(id: number) {
    const level = S.prog.levels[id];
    if (!UPGRADES[id] || level >= maxLevel(id, S.prog.cls) || !pay(upgradeCost(id, level))) return;
    S.prog.levels[id] = level + 1;
    commit();
}

/** Puts a fitting in a slot, buying it first if it is not owned yet. Fittings carry over between hulls. */
export function fitOut(slot: Slot, id: string) {
    const f = fitting(id),
        prog = S.prog;
    if (!f || f.kind !== KIND[slot] || (prog.owned.includes(id) && prog.fit[slot] === id)) return;
    if (!pay(prog.owned.includes(id) ? 0 : f.cost)) return;
    if (!prog.owned.includes(id)) prog.owned.push(id);
    prog.fit[slot] = id;
    commit();
}

/** Takes a hull into commission, buying it first if it is not owned yet. Hulls already owned are kept. */
export function commission(cls: number) {
    const prog = S.prog;
    if (!CLASSES[cls] || (prog.hulls[cls] && prog.cls === cls)) return;
    if (!pay(prog.hulls[cls] ? 0 : CLASS_COST[cls])) return;
    prog.hulls[cls] = true;
    prog.cls = cls;
    commit();
}

/** New faces at the tavern: called each time she comes into port. Whoever was not hired has moved on. */
export function restock() {
    const prog = S.prog;
    prog.tavern = tavernful(prog.nextId, infamyOf(prog.renown));
    prog.nextId += TAVERN_SIZE;
}

/**
 * Hires a recruit out of the tavern into the company. Given a station, she takes it at once if
 * there is a berth for her; otherwise she waits ashore until she is posted.
 */
export function hire(id: number, station: Station | null = null) {
    const prog = S.prog,
        i = prog.tavern.findIndex((s) => s.id === id);
    if (i < 0 || !pay(prog.tavern[i].cost)) return;
    const [s] = prog.tavern.splice(i, 1);
    prog.crew.push(s);
    if (station) prog.crew = withPost(prog.crew, s, station, berthsOf(prog));
    commit();
}

/**
 * Posts one of the company to a station, standing down whoever held it; null stands her down.
 * Refused when she would need a berth and there is none free.
 */
export function post(id: number, station: Station | null) {
    const prog = S.prog,
        s = prog.crew.find((c) => c.id === id);
    if (!s || s.post === station) return;
    const next = withPost(prog.crew, s, station, berthsOf(prog));
    if (S.mode !== 'port' || next === prog.crew) {
        sfx.deny();
        return;
    }
    prog.crew = next;
    sfx.ui();
    commit();
}

/** Hires a consort to sail and fight alongside. */
export function hireEscort() {
    if (S.prog.escorts >= MAX_ESCORTS || !pay(ESCORT_COST)) return;
    launchEscort(S.prog.escorts++);
    saveProgress();
}
