// A crew: several players in one ship. One browser hosts, and the whole game runs there exactly as
// it does for a captain alone; the others join it by a code and are hands aboard the host's ship.
//
// What crosses the wire, as short JSON lists:
//   hand -> host   where they are and what they hold (INPUT_RATE times a second), and the things
//                  they ask for: a gun fired, the anchor dropped.
//   host -> hand   the state of the sea (SNAP_RATE times a second): every ship, the crew, the forts,
//                  the plunder afloat; and what happens as it happens: shot put in flight, guns
//                  going off, news for the crew.
// A hand moves themselves, and the host takes their word for where they are. Everything else is the
// host's to decide: a hand's ships are pictures of the host's (see ghostShip in ships/physics.ts)
// and the shot they see does no harm.
import { sfx } from '@ryqndev/brinewake-audio';
import { clearFoam } from '@ryqndev/brinewake-renderer';
import { cleanCode, type Link, localNetwork, NetError, type Network, peerNetwork, type Room, roomCode } from '@ryqndev/kiln-net';

import { leaveHelm, spawnAboard, spawnCaptain } from '../afoot';
import { afloat, deck, deckAt, trim } from '../deck';
import { clearParticles, debris } from '../fx';
import { leaveGun, servable } from '../gunner';
import { hud } from '../hud';
import { newMate, placeMate } from '../mates';
import { gunnerOf, helmsman, type Mate, mateById, mates, myPost, POST } from '../posts';
import { reviveProgress } from '../save';
import { CLASSES, CREDIT, ESCORT, FOES, type Fort, forts, type Loot, loot, makeShip, maxRange, muzzleBlast, putBall, resetShips, sackFx, serveGun, shipById, ships, SHOT, sinkFx } from '../ships';
import type { Role, ShipType } from '../ships/types';
import { fly, refit } from '../shipyard';
import { ON, PL, S } from '../state';
import { MAX_CREW, NET, net, type NetView } from './role';

/** Both ends must speak the same version of this: bump it whenever a message changes shape. */
const PROTOCOL = 1;
/** What keeps this game's rooms apart from anyone else's on the same matchmaking service. */
const APP = 'brinewake';
/** How often the host tells the hands the state of the sea, and how often a hand says where they are, seconds. */
const SNAP_RATE = 1 / 15,
    INPUT_RATE = 1 / 15;
/** The plunder afloat changes slowly: it goes out with every so many snapshots. */
const LOOT_EVERY = 4;
/** A hand who has heard nothing from the host for this long has lost them, seconds. */
const SILENCE = 10;
/** The longest name a player can go by. */
const NAME = 16;

/** Every kind of ship there is, in an order both ends agree on: a ship crosses the wire as her place in it. */
const TYPES: ShipType[] = [...CLASSES, ESCORT, ...Object.values(FOES)];
const ROLES: Role[] = ['player', 'escort', 'trader', 'patrol', 'hunter', 'flagship'];
const DEAD = 1,
    STRUCK = 2,
    SNARED = 4;

/** What the session needs of the game around it. game.ts fills these in. */
export const netHooks = {
    /** this browser has joined a crew: the sea is about to be replaced by the host's */
    joined: () => {},
    /** this browser is out of a crew it had joined: its own career and its own sea are wanted back */
    left: () => {},
    /** the hand at the wheel has asked for the anchor to be dropped */
    dock: () => {},
};

interface Hand {
    link: Link;
    mate: Mate;
    /** the station they last asked for and were refused, so that they are told once: -1 for none */
    refused: number;
}

let network: Network | null = null;
let room: Room | null = null;
const hands: Hand[] = [];
// a hand's link to the host
let host: Link | null = null;
// who is in the crew, as the host last listed them: number and name
let roster: [number, string][] = [];
let myName = '';
// what has happened since the last frame, waiting to go out to every hand
let events: unknown[] = [];
let snapT = 0,
    snapN = 0,
    inputT = 0,
    silence = 0,
    progDirty = false;
// a hand's own gun, just fired: the host's word on it is not taken until it has had time to hear of the shot
let firedSide = -1,
    firedGun = -1,
    firedT = 0;
// the ship a hand was last put aboard
let boarded = 0;

const r1 = (v: number) => Math.round(v * 10) / 10,
    r2 = (v: number) => Math.round(v * 100) / 100,
    r3 = (v: number) => Math.round(v * 1000) / 1000;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const cleanName = (v: unknown, fallback: string) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, NAME) : '') || fallback;

function show(view: Partial<NetView>) {
    net.view = { ...net.view, ...view };
}

// the players for the screen: this one first, then the rest in the order they are kept
function listShipmates() {
    const was = net.mates,
        n = NET.on ? mates.length + 1 : 0;
    let same = was.length === n;
    for (let i = 0; same && i < n; i++) {
        const m = i ? mates[i - 1] : null;
        same = was[i].id === (m ? m.id : NET.me) && was[i].name === (m ? m.name : myName) && was[i].post === (m ? m.post : myPost());
    }
    if (!same) net.mates = NET.on ? [{ id: NET.me, name: myName, post: myPost() }, ...mates.map((m) => ({ id: m.id, name: m.name, post: m.post }))] : [];
}

/** Use rooms between tabs of this browser instead of over the internet: for working on the game. Call before hosting or joining. */
export function useLocalNetwork() {
    network = localNetwork(APP);
}

const say = (to: Link, ...message: unknown[]) => to.send(JSON.stringify(message));

// ---- hosting ----

/**
 * Opens this game to a crew: friends who are given the code can come aboard as hands. The game goes
 * on exactly as it was, with this browser deciding everything in it.
 */
export function hostCrew(name: string) {
    if (NET.on || net.view.busy || S.drydock) return;
    network ??= peerNetwork(APP);
    myName = cleanName(name, 'Captain');
    const code = roomCode();
    show({ busy: true, error: '', code: '' });
    network.host(code).then(
        (opened) => {
            room = opened;
            NET.on = NET.host = true;
            NET.client = false;
            NET.me = 0;
            NET.onBall = (x, y, z, vx, vy, vz, kind, team, credit) => events.push(['b', r2(x), r2(y), r2(z), r2(vx), r2(vy), r2(vz), kind, team, credit ? 1 : 0]);
            NET.onMuzzle = (x, y, z, dx, dz, heft, loud) => events.push(['m', r1(x), r1(y), r1(z), r2(dx), r2(dz), heft, loud ? 1 : 0]);
            NET.onNews = (title, text) => events.push(['n', title, text]);
            NET.onHit = (player, kill) => {
                const hand = hands.find((h) => h.mate.id === player);
                if (hand) say(hand.link, 'hit', kill ? 1 : 0);
            };
            NET.onRefit = () => {
                progDirty = true;
            };
            roster = [[0, myName]];
            room.onJoin = admit;
            show({ role: 'host', busy: false, code });
        },
        (e: unknown) => show({ busy: false, error: e instanceof NetError && e.failure === 'network' ? 'Could not reach the matchmaking service' : 'Could not open a crew' })
    );
}

// someone has knocked: they are a hand once they have said who they are, in terms this version understands
function admit(link: Link) {
    link.onMessage = (raw) => {
        const m = parse(raw);
        if (!m || m[0] !== 'hi') return;
        const taken = new Set(mates.map((mate) => mate.id));
        let id = 1;
        while (taken.has(id)) id++;
        if (m[1] !== PROTOCOL || id >= MAX_CREW) {
            say(link, 'no', m[1] !== PROTOCOL ? 'version' : 'full');
            link.close();
            return;
        }
        const mate = newMate(id, cleanName(m[2], 'Hand ' + id)),
            hand: Hand = { link, mate, refused: -1 };
        mates.push(mate);
        hands.push(hand);
        roster.push([id, mate.name]);
        say(link, 'welcome', id, S.prog, roster);
        say(link, ...snapshot(true));
        for (const other of hands) if (other !== hand) say(other.link, 'crew', roster);
        hud.news(mate.name + ' has come aboard');
        sfx.bell();
        link.onMessage = (next) => heard(hand, next);
        link.onClose = () => dismiss(hand);
    };
}

// a hand is gone: they left, or were lost
function dismiss(hand: Hand) {
    const i = hands.indexOf(hand);
    if (i < 0) return;
    hands.splice(i, 1);
    mates.splice(mates.indexOf(hand.mate), 1);
    roster = roster.filter(([id]) => id !== hand.mate.id);
    // a wheel let go of is put amidships
    if (hand.mate.post === POST.HELM) PL.ship.rudder = 0;
    for (const other of hands) say(other.link, 'crew', roster);
    hud.news(hand.mate.name + ' has gone ashore');
}

// what a hand had to say
function heard(hand: Hand, raw: string) {
    const m = parse(raw),
        mate = hand.mate,
        s = PL.ship;
    if (!m) return;
    if (m[0] === 'in') {
        placeMate(mate, num(m[1]), num(m[2]), num(m[3]), num(m[4]), num(m[5]));
        mate.speed = num(m[6]);
        mate.air = !!m[7];
        // the station they say they hold is theirs if nobody else has it
        const post = num(m[8]),
            side = m[9] ? 1 : 0,
            gun = Math.floor(num(m[10])),
            key = post * 1000 + side * 100 + gun;
        let free = post === POST.NONE;
        if (post === POST.HELM) {
            const other = helmsman();
            free = PL.afoot && (!other || other === mate);
        } else if (post === POST.GUN) {
            const other = gunnerOf(side, gun);
            free = servable(s, side, gun) && !(PL.gun === gun && PL.gunSide === side) && (!other || other === mate);
        }
        if (free) {
            mate.post = post;
            mate.side = side;
            mate.gun = gun;
            hand.refused = -1;
        } else {
            mate.post = POST.NONE;
            if (hand.refused !== key) say(hand.link, 'no', 'post');
            hand.refused = key;
        }
        mate.rudder = Math.max(-1, Math.min(1, num(m[11])));
        mate.sail = Math.max(0, Math.min(3, Math.round(num(m[12]))));
    } else if (m[0] === 'fire') {
        // their own gun, at a mark inside its reach
        const side = m[1] ? 1 : 0,
            gun = Math.floor(num(m[2]));
        if (mate.post !== POST.GUN || mate.side !== side || mate.gun !== gun || !servable(s, side, gun)) return;
        const reach = maxRange(s.bat[side].gun.shot) + s.hl,
            dx = num(m[3]) - s.x,
            dz = num(m[4]) - s.z,
            d = Math.hypot(dx, dz) || 1,
            k = Math.min(1, reach / d);
        serveGun(s, side, gun, s.x + dx * k, s.z + dz * k, mate.id);
    } else if (m[0] === 'dock') {
        if (mate.post === POST.HELM) netHooks.dock();
    }
}

/** Call once a frame on the host, before the ships are moved: the hand at the wheel, if a hand has it, gives her helm. */
export function helmOrders() {
    const m = helmsman(),
        s = PL.ship;
    if (!NET.host || !m || s.dead) return;
    s.rudder = m.rudder;
    s.sail = m.sail;
}

// where this player is and what they hold, as it is sent: see Mate.tx for what the numbers are measured in
function whereIAm(): number[] {
    const me = PL.me,
        s = PL.ship,
        post = myPost();
    if (me.on === ON.DECK && !s.dead) {
        trim(s);
        deckAt(s, me.lz, true);
        return [ON.DECK, r2(me.lx), r2(me.y - afloat(s, me.lx, deck.y, me.lz)), r2(me.lz), r3(post === POST.GUN ? PL.train : me.yaw - s.yaw), r1(me.speed), me.air ? 1 : 0, post, PL.gunSide, PL.gun];
    }
    return [me.on, r2(me.x), r2(me.y), r2(me.z), r3(me.yaw), r1(me.speed), me.air ? 1 : 0, post, PL.gunSide, PL.gun];
}

// the state of the sea, as the host sends it. `full` adds what does not go out every time.
function snapshot(full: boolean): unknown[] {
    const p = PL.ship;
    return [
        's',
        r3(S.t),
        r3(S.day),
        [p.id, r1(S.hold), S.prog.gold, S.prog.renown, PL.berthed ? 1 : 0],
        ships.map((s) => [
            s.id, TYPES.indexOf(s.type), ROLES.indexOf(s.role), s.team, r2(s.x), r2(s.z), r3(s.yaw), r2(s.v), r3(s.w), s.sail, r2(s.rudder), r1(s.hp), r1(s.max),
            (s.dead ? DEAD : 0) | (s.struck ? STRUCK : 0) | (s.snare > 0 ? SNARED : 0), r2(s.crew), r2(s.rig), s.holder?.id ?? 0,
        ]),
        [r1(p.bat[0].left), r1(p.bat[1].left), p.bat[0].load.map(r1), p.bat[1].load.map(r1)],
        [[0, ...whereIAm(), r2(p.rudder)], ...mates.filter((m) => m.seen).map((m) => [m.id, m.on, r2(m.tx), r2(m.ty), r2(m.tz), r3(m.tyaw), r1(m.speed), m.air ? 1 : 0, m.post, m.side, m.gun, r2(m.rudder)])],
        forts.map((f) => [Math.round(f.hp), Math.ceil(f.down)]),
        full ? loot.map((l) => [r1(l.x), r1(l.z), r1(l.vx), r1(l.vz), l.value, r1(l.life), r1(l.seed), l.kind]) : 0,
    ];
}

// ---- joining ----

/** Joins the crew under a code, as a hand aboard their ship. This browser's own career is put by until it leaves. */
export function joinCrew(code: string, name: string) {
    code = cleanCode(code);
    if (NET.on || net.view.busy || S.drydock || !code) return;
    network ??= peerNetwork(APP);
    myName = cleanName(name, 'Hand');
    show({ busy: true, error: '', code });
    network.join(code).then(
        (link) => {
            host = link;
            silence = 0;
            link.onMessage = told;
            link.onClose = () => lose('The captain has gone ashore: the crew is paid off');
            say(link, 'hi', PROTOCOL, myName);
        },
        (e: unknown) => show({ busy: false, code: '', error: e instanceof NetError && e.failure === 'missing' ? 'No crew is sailing under that code' : 'Could not reach that crew' })
    );
}

// what the host had to say
function told(raw: string) {
    const m = parse(raw);
    if (!m) return;
    silence = 0;
    switch (m[0]) {
        case 'welcome':
            NET.on = NET.client = true;
            NET.host = false;
            NET.me = num(m[1]);
            netHooks.joined();
            S.prog = reviveProgress(m[2]);
            resetShips();
            clearParticles();
            clearFoam();
            debris.length = 0;
            mates.length = 0;
            boarded = 0;
            enlist(m[3]);
            show({ role: 'client', busy: false });
            break;
        case 'no':
            if (m[1] === 'post') {
                // someone else had it first
                if (!PL.afoot) leaveHelm();
                leaveGun();
                hud.toast('Someone else has that station');
            } else lose(m[1] === 'version' ? 'That crew is on a different version of the game: reload and try again' : 'That crew is full');
            break;
        case 'crew':
            enlist(m[1]);
            break;
        case 'prog':
            S.prog = reviveProgress(m[1]);
            if (NET.on) refit(PL.ship);
            break;
        case 's':
            if (NET.client) take(m);
            break;
        case 'e':
            if (NET.client && Array.isArray(m[1])) for (const e of m[1]) if (Array.isArray(e)) happen(e);
            break;
        case 'hit':
            hud.heard.hit(!!m[1]);
            break;
    }
}

// the crew as the host lists it: mates who are new to this browser are added, and those gone are dropped
function enlist(list: unknown) {
    if (!Array.isArray(list)) return;
    roster = list.filter((e): e is [number, string] => Array.isArray(e)).map(([id, name]) => [num(id), cleanName(name, 'Hand')]);
    for (let i = mates.length - 1; i >= 0; i--) if (!roster.some(([id]) => id === mates[i].id)) mates.splice(i, 1);
    for (const [id, name] of roster) {
        if (id === NET.me) continue;
        const mate = mateById(id);
        if (mate) mate.name = name;
        else mates.push(newMate(id, name));
    }
}

// something that happened on the host, to be seen and heard here
function happen(e: unknown[]) {
    if (e[0] === 'b') {
        // a ball that does no harm here: it is given enough weight to throw splinters where it strikes
        const kind = num(e[7]);
        putBall(num(e[1]), num(e[2]), num(e[3]), num(e[4]), num(e[5]), num(e[6]), kind === SHOT.GRAPE ? 1 : 8, num(e[8]), e[9] ? CREDIT.SHIP : CREDIT.NONE, kind);
    } else if (e[0] === 'm') muzzleBlast(num(e[1]), num(e[2]), num(e[3]), num(e[4]), num(e[5]), num(e[6]), !!e[7]);
    else if (e[0] === 'n') {
        if (e[1]) hud.heard.banner(String(e[1]), String(e[2] ?? ''));
        else hud.heard.news(String(e[2] ?? ''));
    }
}

// takes in the host's word on the state of the sea
function take(m: unknown[]) {
    // every part of it, or none of it
    for (let i = 3; i <= 7; i++) if (!Array.isArray(m[i])) return;
    // ---- the clock the swell runs on, and the time of day ----
    const t = num(m[1]),
        day = num(m[2]);
    S.t = Math.abs(t - S.t) > 0.5 ? t : S.t + (t - S.t) * 0.1;
    if (Math.abs(day - S.day) > 0.004 && Math.abs(day - S.day) < 0.996) S.day = day;

    // ---- every ship ----
    const head = m[3] as unknown[],
        list = m[4] as unknown[][],
        mine = num(head[0]),
        seen = new Set<number>();
    for (const e of list) {
        const id = num(e[0]),
            flags = num(e[13]),
            x = num(e[4]),
            z = num(e[5]),
            yaw = num(e[6]);
        seen.add(id);
        let s = shipById(id);
        if (!s) {
            const type = TYPES[num(e[1])],
                role = ROLES[num(e[2])];
            if (!type || !role) continue;
            s = makeShip(role, num(e[3]), type, x, z, yaw);
            s.id = id;
            if (flags & DEAD) {
                // already lost when this browser first heard of her
                s.dead = true;
                s.sink = 0.001;
            }
            if (id === mine) {
                PL.ship = s;
                refit(s);
            }
        }
        s.gx = x;
        s.gz = z;
        s.gyaw = yaw;
        s.v = num(e[7]);
        s.w = num(e[8]);
        // while this hand has her wheel, her helm is as they have it: the host will hear of it
        if (s !== PL.ship || PL.afoot) {
            s.sail = num(e[9]);
            s.rudder = num(e[10]);
        }
        s.hp = num(e[11]);
        s.max = num(e[12]) || s.max;
        s.struck = !!(flags & STRUCK);
        s.crew = num(e[14]);
        s.rig = num(e[15]);
        s.snare = flags & SNARED ? 1 : 0;
        if (flags & DEAD && !s.dead) {
            s.dead = true;
            s.sink = 0.001;
            s.snare = 0;
            sinkFx(s);
        }
    }
    for (let i = ships.length - 1; i >= 0; i--) if (!seen.has(ships[i].id)) ships.splice(i, 1);
    // who holds whom on a line, now that every ship is known; and consorts wear their leader's colours
    const p = PL.ship;
    for (const e of list) {
        const s = shipById(num(e[0]));
        if (!s) continue;
        s.holder = num(e[16]) ? shipById(num(e[16])) : null;
        if (s.role === 'escort') fly(s, p);
    }

    // ---- the crew's ship and what she carries ----
    if (num(head[1]) > S.hold + 0.5) sfx.coin();
    S.hold = num(head[1]);
    S.prog.gold = num(head[2]);
    S.prog.renown = num(head[3]);
    // she has been brought alongside: the canvas this hand had ordered from her wheel is off her
    if (head[4] && !PL.berthed && !PL.afoot) p.sail = p.rudder = 0;
    PL.berthed = !!head[4];
    const guns = m[5] as unknown[];
    for (let side = 0; side < 2; side++) {
        const b = p.bat[side],
            load = guns[2 + side] as unknown[];
        b.left = num(guns[side]);
        for (let i = 0; i < p.hull.guns[side]; i++) if (!(side === firedSide && i === firedGun)) b.load[i] = num(load[i]);
    }
    // put aboard her: on joining, and each time the crew is given a new ship for one that was lost
    if (boarded !== p.id && seen.has(mine)) {
        boarded = p.id;
        if (PL.berthed) spawnCaptain();
        else spawnAboard();
    }

    // ---- everyone else aboard ----
    for (const e of m[6] as unknown[][]) {
        const mate = mateById(num(e[0]));
        if (!mate) continue;
        mate.post = num(e[8]);
        mate.side = num(e[9]) ? 1 : 0;
        mate.gun = num(e[10]);
        mate.rudder = num(e[11]);
        placeMate(mate, num(e[1]), num(e[2]), num(e[3]), num(e[4]), num(e[5]));
        mate.speed = num(e[6]);
        mate.air = !!e[7];
    }

    // ---- the forts, and the plunder afloat ----
    const walls = m[7] as unknown[][];
    for (let i = 0; i < forts.length && i < walls.length; i++) {
        const f: Fort = forts[i],
            down = num(walls[i][1]);
        if (down > 0 && f.down <= 0) sackFx(f);
        f.hp = num(walls[i][0]);
        f.down = down;
    }
    if (Array.isArray(m[8])) {
        loot.length = 0;
        for (const l of m[8] as unknown[][]) loot.push({ x: num(l[0]), z: num(l[1]), vx: num(l[2]), vz: num(l[3]), value: num(l[4]), life: num(l[5]), seed: num(l[6]), kind: num(l[7]) } satisfies Loot);
    }
}

/** A hand asks the host to fire the gun they are serving at a mark on the sea. */
export function askFire(side: number, gun: number, tx: number, tz: number) {
    if (!host) return;
    firedSide = side;
    firedGun = gun;
    firedT = 0.5;
    say(host, 'fire', side, gun, r1(tx), r1(tz));
}

/** A hand at the wheel asks the host to drop anchor. */
export function askDock() {
    if (host) say(host, 'dock');
}

// the crew this browser had joined is gone, and why
function lose(why: string) {
    if (!host) return;
    const link = host,
        aboard = NET.client;
    host = null;
    link.onClose = null;
    link.close();
    disband();
    show({ role: 'off', busy: false, code: '', error: why });
    if (aboard) netHooks.left();
}

// out of any crew: nothing is hosted, nothing is joined, and nobody else is aboard
function disband() {
    // guns are only served in a crew
    leaveGun();
    NET.on = NET.host = NET.client = false;
    NET.me = 0;
    NET.onBall = NET.onMuzzle = NET.onHit = NET.onNews = NET.onRefit = null;
    mates.length = 0;
    hands.length = 0;
    roster = [];
    events = [];
    firedSide = firedGun = -1;
    progDirty = false;
}

/** Leaves the crew: a host pays everyone off and carries on alone; a hand goes back to their own career. */
export function leaveCrew() {
    if (host) lose('');
    else if (room) {
        room.close();
        room = null;
        disband();
        show({ role: 'off', busy: false, code: '', error: '' });
    }
}

/** Runs the session for a frame: what is due to go out goes out. Call once a frame, after the simulation. */
export function netTick(dt: number) {
    if (NET.host) {
        if (events.length) {
            const out = JSON.stringify(['e', events]);
            for (const hand of hands) hand.link.send(out);
            events = [];
        }
        if ((snapT += dt) >= SNAP_RATE) {
            snapT %= SNAP_RATE;
            if (hands.length) {
                if (progDirty) for (const hand of hands) say(hand.link, 'prog', S.prog);
                const out = JSON.stringify(snapshot(snapN++ % LOOT_EVERY === 0));
                for (const hand of hands) hand.link.send(out);
            }
            progDirty = false;
        }
    } else if (host) {
        if (firedT > 0 && (firedT -= dt) <= 0) firedSide = firedGun = -1;
        if (NET.client && (inputT += dt) >= INPUT_RATE) {
            inputT %= INPUT_RATE;
            say(host, 'in', ...whereIAm(), r2(PL.ship.rudder), PL.ship.sail);
        }
        if ((silence += dt) > SILENCE) lose(NET.client ? 'Lost touch with the crew' : 'Could not reach that crew');
    }
    listShipmates();
}

function parse(raw: string): unknown[] | null {
    try {
        const m: unknown = JSON.parse(raw);
        return Array.isArray(m) ? m : null;
    } catch {
        return null;
    }
}
