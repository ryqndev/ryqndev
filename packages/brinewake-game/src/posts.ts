// Who is where aboard, in a crew: the other players as this browser knows them, and which of the
// ship's stations (her wheel, each of her upper-deck guns) is whose. Only the facts are kept here;
// the session (net/session.ts) keeps them true and mates.ts draws them.
import type { Pose } from './figure';
import { PL } from './state';

/** What a player is doing aboard: walking about, at her wheel, or serving one of her guns. */
export const POST = { NONE: 0, HELM: 1, GUN: 2 } as const;

/** Another player of the crew. */
export interface Mate {
    /** their number in the crew: 0 is the host */
    id: number;
    name: string;
    /** false until they have said where they are */
    seen: boolean;
    /** which of ON they stand on */
    on: number;
    /**
     * Where they last said they were, and the way they face. On a deck, x and z are in the ship's own
     * frame and y is how far above her planking they are (below it, for someone in the cabin under
     * that deck); anywhere else all three are the world's.
     */
    tx: number;
    ty: number;
    tz: number;
    tyaw: number;
    /** where they are drawn, eased toward that, in the same terms */
    x: number;
    y: number;
    z: number;
    yaw: number;
    /** their feet in the world, as last drawn: for a name over their head */
    wx: number;
    wy: number;
    wz: number;
    /** how fast they are going over the ground, and whether they are off it */
    speed: number;
    air: boolean;
    /** which of POST they hold, and for a gun, which: its battery (0 port, 1 starboard) and its number */
    post: number;
    side: number;
    gun: number;
    /** the helm they are giving while they have the wheel: rudder and canvas ordered */
    rudder: number;
    sail: number;
    /** where in their stride they are, and what tells them from the next figure */
    phase: number;
    seed: number;
    pose: Pose;
}

/** Everyone in the crew but this player. */
export const mates: Mate[] = [];

/** The mate with a number, if they are still aboard. */
export const mateById = (id: number) => mates.find((m) => m.id === id);

/** The mate at the wheel, if one of them has it. */
export const helmsman = () => mates.find((m) => m.post === POST.HELM);

/** The mate serving a gun, if one of them is. */
export const gunnerOf = (side: number, gun: number) => mates.find((m) => m.post === POST.GUN && m.side === side && m.gun === gun);

/** True while anyone has the wheel: this player, or a mate. */
export const helmed = () => !PL.afoot || !!helmsman();

/** True while anyone is serving a gun: this player, or a mate. */
export const gunManned = (side: number, gun: number) => (PL.gun === gun && PL.gunSide === side) || !!gunnerOf(side, gun);

/** Which of POST this player holds. */
export const myPost = () => (!PL.afoot ? POST.HELM : PL.gun >= 0 ? POST.GUN : POST.NONE);

/** What each player wears, by their number in the crew, in linear light. The host's is null: the ship's own colours. */
export const COATS: (number[] | null)[] = [null, [0.06, 0.42, 0.46], [0.75, 0.5, 0.08], [0.33, 0.12, 0.5], [0.12, 0.4, 0.14], [0.1, 0.2, 0.62]];

/** The same colours for the screen, as CSS. */
export const COAT_CSS = ['#c23a2b', '#3fb6bd', '#e3b341', '#9a5fd0', '#59b35d', '#5b84e0'];
