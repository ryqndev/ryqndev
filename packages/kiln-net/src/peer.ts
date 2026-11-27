// Rooms over WebRTC, by way of PeerJS. The host's browser takes the room's code as its peer id on
// PeerJS's public broker; everyone else looks that id up and is connected straight to the host.
// The broker only makes the introduction: once a link is open, messages go from browser to browser.
//
// PeerJS itself is fetched the first time a room is opened or joined, so a game that is mostly
// played alone does not ship it to everyone.
import type { DataConnection } from 'peerjs';

import { type Link, makeLink, NetError, type Network, type Room } from './link';

/** How long joining may take before it is given up, milliseconds. */
const PATIENCE = 15000;

// a PeerJS failure, as one of ours
function failure(e: unknown): NetError {
    const type = (e as { type?: string } | null)?.type;
    if (type === 'unavailable-id') return new NetError('taken', 'that code is already in use');
    if (type === 'peer-unavailable') return new NetError('missing', 'nobody is hosting under that code');
    return new NetError('network', 'the connection could not be made');
}

// one data connection, as a Link. `after` runs when it ends, from either side.
function linkOf(conn: DataConnection, after?: () => void): Link {
    const feed = makeLink(
        (message) => conn.send(message),
        () => {
            conn.close();
            after?.();
        }
    );
    conn.on('data', (data) => {
        if (typeof data === 'string') feed.deliver(data);
    });
    const gone = () => {
        feed.drop();
        after?.();
    };
    conn.on('close', gone);
    conn.on('error', gone);
    // a browser that vanishes (a closed lid, a lost network) never says goodbye: the ICE state is how it shows
    conn.on('iceStateChanged', (state) => {
        if (state === 'failed' || state === 'closed') gone();
    });
    return feed.link;
}

const peerjs = () =>
    import('peerjs').catch(() => {
        throw new NetError('network', 'the connection could not be made');
    });

/** Rooms over the internet. `app` keeps one game's codes apart from every other user of the broker. */
export function peerNetwork(app: string): Network {
    const idOf = (code: string) => `${app}-${code}`;
    return {
        async host(code) {
            const { Peer } = await peerjs();
            return new Promise<Room>((resolve, reject) => {
                const peer = new Peer(idOf(code));
                let open = false;
                const room: Room = {
                    code,
                    onJoin: null,
                    close() {
                        open = false;
                        peer.destroy();
                    },
                };
                peer.on('open', () => {
                    open = true;
                    resolve(room);
                });
                peer.on('connection', (conn) => {
                    conn.on('open', () => room.onJoin?.(linkOf(conn)));
                });
                // the broker dropped us: the links already made carry on, but nobody new could join
                peer.on('disconnected', () => {
                    if (open && !peer.destroyed) peer.reconnect();
                });
                peer.on('error', (e) => {
                    if (open) return;
                    peer.destroy();
                    reject(failure(e));
                });
            });
        },
        async join(code) {
            const { Peer } = await peerjs();
            return new Promise<Link>((resolve, reject) => {
                const peer = new Peer();
                let settled = false;
                const fail = (e: NetError) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    peer.destroy();
                    reject(e);
                };
                const timer = setTimeout(() => fail(new NetError('network', 'the connection could not be made')), PATIENCE);
                peer.on('open', () => {
                    const conn = peer.connect(idOf(code), { reliable: true, serialization: 'raw' });
                    conn.on('open', () => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        resolve(linkOf(conn, () => peer.destroy()));
                    });
                });
                peer.on('error', (e) => fail(failure(e)));
            });
        },
    };
}
