// The shipyard's catalogue: everything that can be fitted to the player's ship, and the sums that
// turn a build (a hull, its improvements and what is fitted to it) into the ship that sails.
import { gunsASide } from '../models';
import { aboard, manning, POST, type Sailor, sharesOf, type Station } from './crew';
import { BERTHS, CLASSES, HOLDS, maxLevel, UP } from './defs';
import type { GunStats } from './types';

/** What sort of thing a fitting is. Guns go in two slots, one per battery; every other kind has one. */
export type Kind = 'lines' | 'guns' | 'rig' | 'timbers' | 'finish' | 'paint' | 'cloth' | 'sigil';
/** A place on the ship that takes one fitting. */
export type Slot = 'lines' | 'port' | 'starboard' | 'rig' | 'timbers' | 'finish' | 'paint' | 'cloth' | 'sigil';

export const SLOTS: Slot[] = ['lines', 'port', 'starboard', 'rig', 'timbers', 'finish', 'paint', 'cloth', 'sigil'];
export const KIND: Record<Slot, Kind> = { lines: 'lines', port: 'guns', starboard: 'guns', rig: 'rig', timbers: 'timbers', finish: 'finish', paint: 'paint', cloth: 'cloth', sigil: 'sigil' };

/**
 * Something the yard can fit. Bought once, then owned for good and swapped in and out freely.
 * The numbers are multipliers on what the hull has without it, so 1 (or left out) changes nothing.
 */
export interface Fitting {
    /** stable: it is what a save remembers */
    id: string;
    kind: Kind;
    name: string;
    blurb: string;
    cost: number;
    // ---- the ship as a whole ----
    hp?: number;
    speed?: number;
    turn?: number;
    // ---- lines: the build her hull is given, which decides what sort of ship she is ----
    /** the part she plays, as any game with classes would name it */
    role?: string;
    /** which of the hull models' lines she is built to: see LINES in models.ts. It sets her shape and how many guns she mounts */
    form?: number;
    /** plunder her hold takes, and what her factor makes of it when it is banked */
    hold?: number;
    bank?: number;
    /** berths added to what her hull has: a count, not a multiplier */
    berths?: number;
    // ---- guns: the battery they are mounted in. Lines may carry the same figures, for both batteries ----
    /** damage per ball, seconds between broadsides, muzzle speed, aiming error */
    dmg?: number;
    reload?: number;
    shot?: number;
    spread?: number;
    /** how big the gun sounds: 1 is the standard six-pounder */
    heft?: number;
    /** paint and cloth: the tint, in linear light */
    tint?: number[];
    // ---- finishes: skins, which change how she looks and nothing about how she sails ----
    /** which of the hull finishes it is: see SKINS in models.ts */
    skin?: number;
    /** colours a finish brings with it: while it is worn they stand in for the paint and sailcloth chosen */
    paint?: number[];
    cloth?: number[];
    /** a finish that works her sigil in gold instead of paint */
    gilds?: boolean;
    /**
     * Sigils: which device it is (see the sigil shapes in models.ts); 0 is none. On a finish, the
     * device her sails wear when no sigil of her own has been chosen.
     */
    sigil?: number;
}

export const FITTINGS: Fitting[] = [
    // ---- lines: what she is built to do. Any hull can be built to any of them ----
    { id: 'rover', kind: 'lines', name: 'Rover', role: 'All-rounder', blurb: 'The yard’s own draught: some of everything, and no bad habits.', cost: 0, form: 0 },
    {
        id: 'corsair', kind: 'lines', name: 'Corsair', role: 'Skirmisher',
        blurb: 'Fined down and over-sparred, with a gun landed from each side. She picks her fights, and leaves the ones she does not like.',
        cost: 900, form: 1, speed: 1.15, turn: 1.2, hp: 0.78, hold: 0.8,
    },
    {
        id: 'bombard', kind: 'lines', name: 'Bombard', role: 'Artillery',
        blurb: 'Broad in the beam, to carry more guns, heavier shot and the powder to throw it further. Slow to arrive and slower to turn.',
        cost: 1400, form: 2, dmg: 1.15, shot: 1.07, speed: 0.88, turn: 0.82,
    },
    {
        id: 'ironside', kind: 'lines', name: 'Ironside', role: 'Tank',
        blurb: 'High sides, doubled planking, and iron strapped over the lot. She is there to be shot at.',
        cost: 1400, form: 3, hp: 1.5, speed: 0.9, turn: 0.88,
    },
    {
        id: 'smuggler', kind: 'lines', name: 'Smuggler', role: 'Support',
        blurb: 'Deep and full-bellied, with false bulkheads, room for more hands, and a factor ashore who asks no questions.',
        cost: 1100, form: 4, hold: 1.6, berths: 2, bank: 1.1, speed: 0.96, turn: 0.9,
    },
    // ---- guns ----
    { id: 'saker', kind: 'guns', name: 'Sakers', blurb: 'The six-pounders she was launched with. Honest at every range.', cost: 0 },
    { id: 'falconet', kind: 'guns', name: 'Falconets', blurb: 'Light guns served at the double. Less in each ball, far more balls.', cost: 500, dmg: 0.58, reload: 0.52, shot: 0.93, spread: 1.25, heft: 0.7 },
    { id: 'long', kind: 'guns', name: 'Long nines', blurb: 'Long barrels that reach a third further and land where they are laid.', cost: 900, dmg: 0.95, reload: 1.12, shot: 1.16, spread: 0.55, heft: 1.05 },
    { id: 'carronade', kind: 'guns', name: 'Carronades', blurb: 'Short, fat smashers. Ruinous alongside, useless at a distance.', cost: 1300, dmg: 1.75, reload: 1.2, shot: 0.76, spread: 1.5, heft: 1.3 },
    { id: 'demicannon', kind: 'guns', name: 'Demi-cannon', blurb: 'The heaviest iron a deck will bear. Slow to serve, and it slows her.', cost: 2200, dmg: 2.2, reload: 1.7, heft: 1.5, speed: 0.96 },
    // ---- rig ----
    { id: 'square', kind: 'rig', name: 'Square rig', blurb: 'Courses and topsails, as the yard hung them.', cost: 0 },
    { id: 'foreaft', kind: 'rig', name: 'Fore-and-aft cut', blurb: 'Comes about like a cutter, at the price of a knot.', cost: 400, turn: 1.2, speed: 0.95 },
    { id: 'cloud', kind: 'rig', name: 'Cloud of canvas', blurb: 'Royals and studding sails. Flies in a straight line, slow in stays.', cost: 650, speed: 1.12, turn: 0.9 },
    { id: 'silk', kind: 'rig', name: 'Silk-laid canvas', blurb: 'Light as a rumour and strong as hemp. Better at everything, and priced like it.', cost: 2600, speed: 1.07, turn: 1.07 },
    // ---- timbers ----
    { id: 'pine', kind: 'timbers', name: 'Pine planking', blurb: 'What she was built of. Cheap, and it floats.', cost: 0 },
    { id: 'cedar', kind: 'timbers', name: 'Cedar scantlings', blurb: 'Light frames: quick and handy, and thin where the shot comes in.', cost: 350, hp: 0.85, speed: 1.07, turn: 1.08 },
    { id: 'oak', kind: 'timbers', name: 'Oak framing', blurb: 'Stout ribs that shrug off a broadside and weigh what they should.', cost: 600, hp: 1.28, speed: 0.95 },
    { id: 'ironbound', kind: 'timbers', name: 'Ironbound live oak', blurb: 'A floating fortress, and about as nimble.', cost: 1700, hp: 1.6, speed: 0.9, turn: 0.9 },
    // ---- finishes ----
    { id: 'timber', kind: 'finish', name: 'Bare timber', blurb: 'Oiled planking under whatever paint and canvas you choose.', cost: 0, skin: 0 },
    {
        id: 'blackgold', kind: 'finish', name: 'Black and gold',
        blurb: 'Ebony from rail to waterline and copper below it, every edge gilded, black canvas, and her sigil worked in gold: an anchor, unless you choose another.',
        cost: 1800, skin: 1, paint: [0.014, 0.014, 0.016], cloth: [0.035, 0.035, 0.04], gilds: true, sigil: 1,
    },
    // ---- paint: the wale and the flag ----
    { id: 'crimson', kind: 'paint', name: 'Crimson', blurb: '', cost: 0, tint: [0.72, 0.1, 0.08] },
    { id: 'tar', kind: 'paint', name: 'Tar black', blurb: '', cost: 60, tint: [0.035, 0.035, 0.04] },
    { id: 'bone', kind: 'paint', name: 'Bone', blurb: '', cost: 60, tint: [0.86, 0.8, 0.66] },
    { id: 'ochre', kind: 'paint', name: 'Ochre', blurb: '', cost: 60, tint: [0.8, 0.5, 0.08] },
    { id: 'tangerine', kind: 'paint', name: 'Tangerine', blurb: '', cost: 60, tint: [0.9, 0.3, 0.04] },
    { id: 'emerald', kind: 'paint', name: 'Emerald', blurb: '', cost: 60, tint: [0.05, 0.42, 0.18] },
    { id: 'teal', kind: 'paint', name: 'Teal', blurb: '', cost: 60, tint: [0.04, 0.42, 0.46] },
    { id: 'cobalt', kind: 'paint', name: 'Cobalt', blurb: '', cost: 60, tint: [0.08, 0.16, 0.7] },
    { id: 'violet', kind: 'paint', name: 'Violet', blurb: '', cost: 60, tint: [0.32, 0.08, 0.52] },
    { id: 'rose', kind: 'paint', name: 'Rose', blurb: '', cost: 60, tint: [0.88, 0.24, 0.42] },
    // ---- sailcloth ----
    { id: 'black', kind: 'cloth', name: 'Black', blurb: '', cost: 0, tint: [0.045, 0.04, 0.045] },
    { id: 'bleached', kind: 'cloth', name: 'Bleached', blurb: '', cost: 90, tint: [1, 0.98, 0.92] },
    { id: 'tanbark', kind: 'cloth', name: 'Tanbark', blurb: '', cost: 90, tint: [0.62, 0.26, 0.12] },
    { id: 'blood', kind: 'cloth', name: 'Blood', blurb: '', cost: 90, tint: [0.6, 0.05, 0.04] },
    { id: 'saffron', kind: 'cloth', name: 'Saffron', blurb: '', cost: 90, tint: [0.95, 0.62, 0.1] },
    { id: 'seagreen', kind: 'cloth', name: 'Sea green', blurb: '', cost: 90, tint: [0.1, 0.5, 0.36] },
    { id: 'indigo', kind: 'cloth', name: 'Indigo', blurb: '', cost: 90, tint: [0.1, 0.12, 0.5] },
    { id: 'plum', kind: 'cloth', name: 'Plum', blurb: '', cost: 90, tint: [0.36, 0.08, 0.36] },
    // ---- sigils: the device on every square sail ----
    { id: 'nosigil', kind: 'sigil', name: 'Plain', blurb: '', cost: 0, sigil: 0 },
    { id: 'anchor', kind: 'sigil', name: 'Anchor', blurb: '', cost: 150, sigil: 1 },
    { id: 'skull', kind: 'sigil', name: 'Skull and bones', blurb: '', cost: 150, sigil: 2 },
    { id: 'cutlasses', kind: 'sigil', name: 'Cutlasses', blurb: '', cost: 150, sigil: 3 },
    { id: 'compass', kind: 'sigil', name: 'Compass rose', blurb: '', cost: 150, sigil: 4 },
    { id: 'crown', kind: 'sigil', name: 'Crown', blurb: '', cost: 150, sigil: 5 },
];

const BY_ID = new Map(FITTINGS.map((f) => [f.id, f]));
const BY_KIND = new Map<Kind, Fitting[]>();
for (const f of FITTINGS) BY_KIND.set(f.kind, [...(BY_KIND.get(f.kind) ?? []), f]);

export const fitting = (id: string) => BY_ID.get(id);
/** Everything of one kind, in the order the yard lists it. */
export const fittingsOf = (kind: Kind) => BY_KIND.get(kind)!;

/** What a new ship comes with in each slot: fittings that cost nothing and are always owned. */
export const STOCK: Record<Slot, string> = { lines: 'rover', port: 'saker', starboard: 'saker', rig: 'square', timbers: 'pine', finish: 'timber', paint: 'crimson', cloth: 'black', sigil: 'nosigil' };

/** Everything that decides what the player's ship is. */
export interface Build {
    /** hull, as an index into CLASSES */
    cls: number;
    /** level of each improvement, indexed like UPGRADES */
    levels: number[];
    /** the id of the fitting in each slot */
    fit: Record<Slot, string>;
    /** everyone hired, aboard or ashore: see crew.ts */
    crew: Sailor[];
}

/** What a build comes to. */
export interface ShipStats {
    hp: number;
    speed: number;
    turn: number;
    /** the most plunder she carries, in gold */
    hold: number;
    /** guns in each battery */
    guns: number;
    /** each battery's gun, port then starboard */
    bat: [GunStats, GunStats];
    paint: number[];
    cloth: number[];
    /** the finish her hull wears, and the lines she is built to: indices into the hull models' skins and lines */
    skin: number;
    form: number;
    /** the device on her sails (0: none), whether it is worked in gold, and the colour it is painted when it is not */
    sigil: number;
    gilt: boolean;
    ink: number[];
    /** crew she can berth, and how many are aboard */
    berths: number;
    aboard: number;
    /** the fraction of what is banked that goes to the crew */
    share: number;
    /** hull mended each second at sea */
    mend: number;
    /** what the purser makes of the plunder: a multiplier on gold banked */
    bank: number;
}

/** The fitting a build has in a slot. Anything it should not have there reads as the stock one. */
export function fitted(b: Build, slot: Slot): Fitting {
    const f = BY_ID.get(b.fit[slot]);
    return f && f.kind === KIND[slot] ? f : BY_ID.get(STOCK[slot])!;
}

/** The level of an improvement a build has the use of: what was paid for, as far as her hull can carry it. */
export const levelOf = (b: Build, id: number) => Math.min(b.levels[id], maxLevel(id, b.cls));

/** Crew a build can berth: what the hull has, what her lines add, and two more for each level of living quarters. */
export const berthsOf = (b: Build) => BERTHS[b.cls] + (fitted(b, 'lines').berths ?? 0) + 2 * levelOf(b, UP.QUARTERS);

/** The most plunder a build's hold takes, in gold. */
export const holdOf = (b: Build) => Math.round(HOLDS[b.cls] * (1 + 0.4 * b.levels[UP.HOLD]) * (fitted(b, 'lines').hold ?? 1));

const BONE = [0.86, 0.8, 0.66],
    PITCH = [0.03, 0.03, 0.035];
/**
 * The colour a sigil is painted: her paint, where that shows against her sailcloth; if the two are
 * too alike to tell apart, bone on dark cloth or pitch on light.
 */
export function inkFor(paint: number[], cloth: number[]): number[] {
    const apart = Math.max(Math.abs(paint[0] - cloth[0]), Math.abs(paint[1] - cloth[1]), Math.abs(paint[2] - cloth[2]));
    if (apart > 0.22) return paint;
    return cloth[0] + cloth[1] + cloth[2] < 0.9 ? BONE : PITCH;
}

/** Works a build out into the ship it makes. */
export function shipStats(b: Build): ShipStats {
    const c = CLASSES[b.cls],
        L = b.levels,
        port = fitted(b, 'port'),
        starboard = fitted(b, 'starboard'),
        finish = fitted(b, 'finish'),
        lines = fitted(b, 'lines'),
        decks = L[UP.GUNDECK],
        berths = berthsOf(b),
        company = aboard(b.crew, berths);
    // every deck built into her is weight carried; a good hand at the wheel or the sheets earns it back
    let hp = c.hp * (1 + 0.18 * L[UP.HULL]),
        speed = c.speed * (1 + 0.06 * L[UP.SAILS]) * (1 - 0.08 * decks) * (1 - 0.02 * levelOf(b, UP.QUARTERS)) * (1 + POST.speed * manning(company, 'sails')),
        turn = c.turn * (1 + 0.1 * L[UP.RUDDER]) * (1 - 0.1 * decks) * (1 + POST.turn * manning(company, 'helm'));
    for (const f of [lines, port, starboard, fitted(b, 'rig'), fitted(b, 'timbers')]) {
        hp *= f.hp ?? 1;
        speed *= f.speed ?? 1;
        turn *= f.turn ?? 1;
    }
    // a battery is the gun in it, the ship it is mounted in, the tackle it is worked with, and the captain who drills its crew
    const gun = (f: Fitting, captain: Station): GunStats => ({
        dmg: c.dmg * (1 + 0.14 * L[UP.CANNONS]) * (f.dmg ?? 1) * (lines.dmg ?? 1),
        reload: c.reload * Math.pow(0.91, L[UP.TACKLE]) * (f.reload ?? 1) * (lines.reload ?? 1) * (1 - POST.reload * manning(company, captain)),
        shot: c.shot * (f.shot ?? 1) * (lines.shot ?? 1),
        spread: c.spread * (f.spread ?? 1) * (lines.spread ?? 1) * (1 - POST.spread * manning(company, captain)),
        heft: f.heft ?? 1,
    });
    hp = Math.round(hp);
    const paint = finish.paint ?? fitted(b, 'paint').tint!,
        cloth = finish.cloth ?? fitted(b, 'cloth').tint!;
    return {
        hp,
        speed,
        turn,
        hold: holdOf(b),
        guns: gunsASide(c.hull, decks, lines.form),
        bat: [gun(port, 'port'), gun(starboard, 'starboard')],
        // a finish with colours of its own wears them over whatever paint and cloth were chosen
        paint,
        cloth,
        skin: finish.skin ?? 0,
        form: lines.form ?? 0,
        // her own sigil if she has chosen one, or else the one her finish comes with
        sigil: fitted(b, 'sigil').sigil || finish.sigil || 0,
        gilt: !!finish.gilds,
        ink: inkFor(paint, cloth),
        berths,
        aboard: company.length,
        share: sharesOf(company),
        mend: hp * POST.mend * manning(company, 'carpenter'),
        bank: (lines.bank ?? 1) * (1 + POST.bank * manning(company, 'purser')),
    };
}
