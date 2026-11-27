// What part this browser is playing in a crew, the few things the simulation tells the session
// about as they happen, and what the screen is shown of it all. It imports nothing, so anything in
// the game can ask it without a cycle: the session (session.ts) fills in the hooks and keeps the
// rest true, and the simulation calls them without knowing it.

/** The most players in a crew, the host among them. */
export const MAX_CREW = 6;

export interface NetRole {
    /** in a crew at all: its host, or one of its hands */
    on: boolean;
    /** the browser the simulation runs in: everything that happens is decided here */
    host: boolean;
    /** a hand in someone else's crew: ships and shot here are only pictures of the host's */
    client: boolean;
    /** this player's number in the crew: 0 is the host */
    me: number;
    /** the player whose shot is being scored just now, while hits are resolved: -1 for none */
    shooter: number;
    /** a ball was put in flight: position, velocity, what it is, whose side, and who is credited with it (see launchBall) */
    onBall: ((x: number, y: number, z: number, vx: number, vy: number, vz: number, kind: number, team: number, credit: number) => void) | null;
    /** a gun went off at a point, firing along (dx, dz) */
    onMuzzle: ((x: number, y: number, z: number, dx: number, dz: number, heft: number, loud: boolean) => void) | null;
    /** a hand's shot told: their hit marker is theirs to see, not the host's */
    onHit: ((player: number, kill: boolean) => void) | null;
    /** news for the whole crew: a banner when there is a title, else a line of text */
    onNews: ((title: string, text: string) => void) | null;
    /** the crew's ship was rebuilt to a build */
    onRefit: (() => void) | null;
}

/** Where this browser stands in a crew, for the menus. */
export interface NetView {
    role: 'off' | 'host' | 'client';
    /** opening a room or joining one, and not there yet */
    busy: boolean;
    /** the room's code: what the host reads out and a hand types */
    code: string;
    /** why the last attempt failed, or why a crew was lost; empty when there is nothing to say */
    error: string;
}
/** One of the players in a crew, for the screen. (Not one of the hired company: see Sailor in ships/crew.ts.) */
export interface Shipmate {
    id: number;
    name: string;
    /** which of POST they hold (posts.ts) */
    post: number;
}

/** What the screen shows of a crew. Both are replaced, never changed in place, so that the HUD can tell when they have. */
export const net: { view: NetView; mates: Shipmate[] } = { view: { role: 'off', busy: false, code: '', error: '' }, mates: [] };

export const NET: NetRole = { on: false, host: false, client: false, me: 0, shooter: -1, onBall: null, onMuzzle: null, onHit: null, onNews: null, onRefit: null };
