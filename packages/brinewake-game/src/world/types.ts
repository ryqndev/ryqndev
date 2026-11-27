import type { Mesh } from '@ryqndev/brinewake-renderer';

/** A lantern: it only gives light once the environment's lamp level rises (dusk to dawn). */
export interface WorldLight {
    x: number;
    y: number;
    z: number;
    r: number;
    g: number;
    b: number;
    rad: number;
    /** sprite size of the flare drawn at the light */
    glow: number;
}

export interface Port {
    /** centre and radius of the roads a ship can dock from: they take in the whole harbour */
    x: number;
    z: number;
    r: number;
    /** heading a ship anchored in the roads faces: out to sea */
    yaw: number;
    /**
     * Where the player's ship lies once she has docked: a point on the seaward face of the wharf's
     * head, the heading she lies on along it, and the way off the wharf out to sea (a unit vector).
     */
    berth: { x: number; z: number; yaw: number; nx: number; nz: number };
    /** the middle of the town behind it: what the sun's shadows are shared with, and where its works are gathered */
    tx: number;
    tz: number;
}

/** A boat lying to a mooring in the harbour: 0 a rowing boat, 1 a fishing smack, 2 a brig alongside, 3 a sloop at anchor. */
export interface Mooring {
    x: number;
    z: number;
    yaw: number;
    kind: number;
}

/** What the home port's townsfolk, gulls and smoke need to know of the town they belong to. All in world space. */
export interface Town {
    /** middle of the town, and how far from it anything of it reaches */
    x: number;
    z: number;
    reach: number;
    /** closed circuits people walk, as [x, y, z] points, and how many walk each */
    walks: { pts: number[][]; n: number; guard?: boolean }[];
    /** where people stand about: [x, y, z, facing] */
    idlers: number[][];
    moorings: Mooring[];
    /** chimney tops, and open fires */
    smokes: number[][];
    flames: number[][];
    /** the windmill's hub, the way its sails face, and their span */
    mill: { x: number; y: number; z: number; yaw: number } | null;
    /** the point the gulls wheel over */
    gulls: number[];
    /** the lighthouse lamp */
    beam: number[];
}

/** A fort that can be sacked: where it stands, how big it is, and where its treasure ends up when it falls. */
export interface Stronghold {
    name: string;
    x: number;
    z: number;
    yaw: number;
    /** radius of its walls, and the height of their tops above the sea */
    r: number;
    top: number;
    /** a point on open water in front of it, as [x, z] */
    spill: number[];
}

export interface World {
    mesh: { props: Mesh; terrain: Mesh };
    lights: WorldLight[];
    port: Port;
    town: Town;
    /** the king's forts on the outer islands */
    strongholds: Stronghold[];
    /** things afloat or standing in the sea that a hull cannot pass through, as [x, z, radius] */
    solids: number[][];
    /** open-water waypoints ringing the archipelago, as [x, z]: trade routes and patrol beats */
    routes: number[][];
}
