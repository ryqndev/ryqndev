/** Why a room could not be opened or joined. */
export type NetFailure =
    /** the code is already somebody's room */
    | 'taken'
    /** nobody is hosting under that code */
    | 'missing'
    /** the matchmaking service could not be reached, or the two browsers could not be connected */
    | 'network';

export class NetError extends Error {
    constructor(
        readonly failure: NetFailure,
        message: string
    ) {
        super(message);
    }
}

/**
 * One end of a connection to another player. Messages are strings, and arrive whole and in the
 * order they were sent. Anything that arrives before `onMessage` is set is kept for it.
 */
export interface Link {
    send(message: string): void;
    /** Hangs up. `onClose` is not called for a link closed from this end. */
    close(): void;
    onMessage: ((message: string) => void) | null;
    /** The other end hung up, or was lost. */
    onClose: (() => void) | null;
}

/** A room being hosted: everyone who joins it gets a link to the host, and only to the host. */
export interface Room {
    /** what the others type to join */
    readonly code: string;
    /** Someone joined. Set it before anyone is given the code. */
    onJoin: ((link: Link) => void) | null;
    /** Shuts the room and hangs up on everyone in it. */
    close(): void;
}

/** A way of putting browsers in touch with each other. */
export interface Network {
    /** Opens a room under a code. Fails with 'taken' when the code is in use, 'network' when the service cannot be reached. */
    host(code: string): Promise<Room>;
    /** Joins the room under a code. Fails with 'missing' when there is none, 'network' when it cannot be reached. */
    join(code: string): Promise<Link>;
}

/** What a transport gets back from makeLink: the link to hand out, and the two ways it feeds it. */
export interface LinkFeed {
    link: Link;
    /** a message came in */
    deliver(message: string): void;
    /** the other end is gone */
    drop(): void;
}

/** Builds a Link over a transport's own send and close. */
export function makeLink(send: (message: string) => void, close: () => void): LinkFeed {
    const early: string[] = [];
    let listener: ((message: string) => void) | null = null,
        open = true;
    const link: Link = {
        send(message) {
            if (open) send(message);
        },
        close() {
            if (!open) return;
            open = false;
            close();
        },
        get onMessage() {
            return listener;
        },
        set onMessage(fn) {
            listener = fn;
            if (fn) for (const message of early.splice(0)) fn(message);
        },
        onClose: null,
    };
    return {
        link,
        deliver(message) {
            if (!open) return;
            if (listener) listener(message);
            else early.push(message);
        },
        drop() {
            if (!open) return;
            open = false;
            link.onClose?.();
        },
    };
}

// no I, O, 0 or 1: a code is read out loud and typed by someone else
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A fresh room code: short enough to say, long enough that two rooms do not collide. */
export function roomCode(length = 5): string {
    const pick = new Uint32Array(length);
    crypto.getRandomValues(pick);
    return Array.from(pick, (n) => ALPHABET[n % ALPHABET.length]).join('');
}

/** A code as someone typed it, made fit to compare: upper case, and nothing that is not in a code. */
export const cleanCode = (typed: string) =>
    typed
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
