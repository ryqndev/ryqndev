import type { Pylon } from '../world';

export interface BossNode {
    hp: number;
    /** visual scale, eases to 0 when shattered */
    sc: number;
    fl: number;
}

/** type: 0 skitter, 1 lancer, 2 bulwark, 3 colossus (boss). */
export interface Foe {
    type: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    yaw: number;
    pitch: number;
    hp: number;
    max: number;
    /** body radius, top speed, mass, broad-phase radius */
    r: number;
    sp: number;
    mass: number;
    br: number;
    /** hit spheres in local space: [x, y, z, radius, bossNodeIndex?] */
    hs: number[][];
    /** behaviour state and seconds spent in it */
    st: number;
    t: number;
    flash: number;
    burn: number;
    /** total size of the gel stuck to it; slows it down */
    goo: number;
    /** below zero while it is still emerging from the ground */
    rise: number;
    sc: number;
    anim: number;
    dead: boolean;
    strafe: number;
    sft: number;
    cd: number;
    charge: number;
    arm: number;
    seed: number;
    hitP: boolean;
    air: boolean;
    wake: number;
    // ---- colossus only ----
    nodes: BossNode[];
    stun: number;
    kneel: number;
    /** volley and stomp cooldowns, shards fired in the current volley, completed stun cycles */
    vcd: number;
    scd: number;
    n: number;
    cycle: number;
    /** travelling ground shockwave: radius (negative when idle), origin, already-hit flag */
    ring: number;
    rx: number;
    rz: number;
    ringHit: boolean;
}

export interface Blob {
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
    size: number;
    /** how many gel shots have merged into it; drives blast damage */
    m: number;
    wob: number;
    wobV: number;
    /** 0 idle, then 0..1 fuse progress once ignited */
    heat: number;
    fuse: number;
    host: Foe | null;
    /** boss node it is stuck to, or -1 */
    node: number;
    /** position and normal in the host's local space */
    lx: number;
    ly: number;
    lz: number;
    lnx: number;
    lnz: number;
    seed: number;
    age: number;
    /** frozen pylon it is stuck to */
    py: Pylon | null;
}

export interface Gel {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    age: number;
    seed: number;
}
export interface Bolt {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    age: number;
}
export interface Fire {
    x: number;
    y: number;
    z: number;
    life: number;
    r: number;
    t: number;
}
/** type: 0 ice shard (straight), 1 boulder (lobbed, bursts on impact). */
export interface EnemyShot {
    type: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    dmg: number;
    rot: number;
}

export interface Director {
    /** pylons reignited so far */
    lit: number;
    /** enemy types waiting to spawn */
    queue: number[];
    qt: number;
    amb: number;
    t: number;
    boss: Foe | null;
    bossT: number;
    won: boolean;
    wave: number;
}
