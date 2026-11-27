// Rooms between tabs of one browser, over a BroadcastChannel. Nothing leaves the machine: this is
// for working on a multiplayer game, and for testing one, without the internet in the way.
import { type LinkFeed, makeLink, NetError, type Network, type Room } from './link';

/** How long a room has to answer before there is taken to be none, milliseconds. */
const PATIENCE = 1200;

type Wire =
    // a joiner asking for the room, and the room's host answering it
    | { t: 'knock'; from: string }
    | { t: 'enter'; to: string }
    // a message on a link, addressed by the joiner's id and which way it is going
    | { t: 'say'; id: string; up: boolean; d: string }
    | { t: 'bye'; id: string; up: boolean };

/** Rooms between this browser's own tabs. `app` keeps one game's rooms apart from another's. */
export function localNetwork(app: string): Network {
    const channel = (code: string) => new BroadcastChannel(`kiln-net:${app}:${code}`);
    // one end of a link over a channel: `up` is true at the joiner's end, whose messages go up to the host
    const end = (ch: BroadcastChannel, id: string, up: boolean, after?: () => void): LinkFeed =>
        makeLink(
            (d) => ch.postMessage({ t: 'say', id, up, d } satisfies Wire),
            () => {
                ch.postMessage({ t: 'bye', id, up } satisfies Wire);
                after?.();
            }
        );
    return {
        host(code) {
            const ch = channel(code),
                feeds = new Map<string, LinkFeed>();
            const room: Room = {
                code,
                onJoin: null,
                close() {
                    for (const id of feeds.keys()) ch.postMessage({ t: 'bye', id, up: false } satisfies Wire);
                    feeds.clear();
                    ch.close();
                },
            };
            ch.onmessage = (e: MessageEvent<Wire>) => {
                const m = e.data;
                if (m.t === 'knock') {
                    const feed = end(ch, m.from, false, () => feeds.delete(m.from));
                    feeds.set(m.from, feed);
                    ch.postMessage({ t: 'enter', to: m.from } satisfies Wire);
                    room.onJoin?.(feed.link);
                } else if (m.t === 'say' && m.up) feeds.get(m.id)?.deliver(m.d);
                else if (m.t === 'bye' && m.up) {
                    feeds.get(m.id)?.drop();
                    feeds.delete(m.id);
                }
            };
            // a tab that is closed takes its room with it
            window.addEventListener('pagehide', () => room.close(), { once: true });
            return Promise.resolve(room);
        },
        join(code) {
            return new Promise((resolve, reject) => {
                const ch = channel(code),
                    id = crypto.randomUUID(),
                    feed = end(ch, id, true, () => ch.close());
                let entered = false;
                const timer = setTimeout(() => {
                    ch.close();
                    reject(new NetError('missing', 'nobody is hosting under that code'));
                }, PATIENCE);
                ch.onmessage = (e: MessageEvent<Wire>) => {
                    const m = e.data;
                    if (m.t === 'enter' && m.to === id && !entered) {
                        entered = true;
                        clearTimeout(timer);
                        resolve(feed.link);
                    } else if (m.t === 'say' && !m.up && m.id === id) feed.deliver(m.d);
                    else if (m.t === 'bye' && !m.up && m.id === id) {
                        feed.drop();
                        ch.close();
                    }
                };
                window.addEventListener('pagehide', () => feed.link.close(), { once: true });
                ch.postMessage({ t: 'knock', from: id } satisfies Wire);
            });
        },
    };
}
