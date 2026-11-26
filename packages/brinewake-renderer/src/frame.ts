export interface LightUniforms {
    /** xyz + radius per light */
    pos: Float32Array;
    /** linear HDR rgb per light */
    col: Float32Array;
    n: number;
}

export interface FoamStamps {
    /** FOAM_STRIDE floats per stamp: x, z, radius, strength */
    data: Float32Array;
    /** stamps queued; the renderer draws them into the foam map and resets this to zero */
    n: number;
}

/**
 * Everything the renderer needs from the simulation for one frame.
 * The caller owns and reuses every buffer, so nothing is allocated per frame.
 */
export interface Frame {
    /** shader clock, seconds: drives the swell, so it must be the clock seaHeight() is sampled with */
    time: number;
    dt: number;
    lights: LightUniforms;
    /** PARTICLE_STRIDE floats per particle */
    particles: Float32Array;
    particleCount: number;
    foam: FoamStamps;
    /** the point the sun's shadow map is centred on */
    focusX: number;
    focusZ: number;
}
