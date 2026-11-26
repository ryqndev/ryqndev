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
    /** centre and radius of the anchorage a ship can dock from */
    x: number;
    z: number;
    r: number;
    /** heading a moored ship faces: out to sea */
    yaw: number;
    /** foot of the pier on the beach, for the camera to look back at */
    tx: number;
    tz: number;
}

export interface World {
    mesh: { props: Mesh; terrain: Mesh };
    lights: WorldLight[];
    port: Port;
    /** open-water waypoints ringing the archipelago, as [x, z]: trade routes and patrol beats */
    routes: number[][];
}
