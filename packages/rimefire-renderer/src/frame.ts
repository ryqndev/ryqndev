export interface LightUniforms {
    /** xyz + radius per light */
    pos: Float32Array;
    /** linear HDR rgb per light */
    col: Float32Array;
    n: number;
}

export interface Shockwave {
    x: number;
    y: number;
    z: number;
    /** seconds since it was spawned */
    t: number;
    str: number;
}

/**
 * Everything the renderer needs from the simulation for one frame.
 * The caller owns and reuses every buffer, so nothing is allocated per frame.
 */
export interface Frame {
    /** shader clock, seconds */
    time: number;
    dt: number;
    lights: LightUniforms;
    /** PARTICLE_STRIDE floats per particle */
    particles: Float32Array;
    particleCount: number;
    /** GOO_STRIDE floats per blob */
    goo: Float32Array;
    gooCount: number;
    /** scorch stamps as [x, z, radius, burn, heat] tuples; drained by the renderer */
    stamps: number[];
    shockwaves: Shockwave[];
}
