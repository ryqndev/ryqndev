import type { Mesh } from '@ryqndev/rimefire-renderer';

/** Box rotated about Y. `c`/`s` are cos/sin of its yaw, `br` its bounding radius in XZ. */
export interface BoxCollider {
    t: 0;
    x: number;
    y: number;
    z: number;
    hx: number;
    hy: number;
    hz: number;
    c: number;
    s: number;
    br: number;
    off: boolean;
}
/** Vertical cylinder spanning y0..y1. */
export interface CylCollider {
    t: 1;
    x: number;
    z: number;
    r: number;
    y0: number;
    y1: number;
    off: boolean;
}
export type Collider = BoxCollider | CylCollider;

/** Segment-cast result: hit point and surface normal. */
export interface Hit {
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
}

export interface WorldLight {
    x: number;
    y: number;
    z: number;
    r: number;
    g: number;
    b: number;
    rad: number;
    /** shadow code: the light's index among the renderer's static lights, or SHADOW_NONE */
    shadow: number;
}
export interface Glow {
    x: number;
    y: number;
    z: number;
    s: number;
    r: number;
    g: number;
    b: number;
    blink?: number;
}
export interface Pylon {
    x: number;
    z: number;
    y: number;
    lit: boolean;
    hp: number;
    /** 0..1 dissolve of the ice shell */
    thaw: number;
    glow: number;
    hitT: number;
    col: CylCollider;
    k: number;
    /** shadow code of the light it gives off once reignited */
    shadow: number;
}
export interface Heart {
    col: CylCollider;
    awake: boolean;
    diss: number;
}
export interface World {
    cols: Collider[];
    lights: WorldLight[];
    glows: Glow[];
    pylons: Pylon[];
    /** enemy spawn points as [x, z] */
    spawns: number[][];
    heart: Heart;
    mesh: { props: Mesh; terrain: Mesh };
    /** thaw health of a frozen pylon */
    PYHP: number;
}
