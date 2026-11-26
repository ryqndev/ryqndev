import { m4, m4mul, m4persp, type Mat4 } from '@ryqndev/rimefire-math';

import { gl } from './gl/context';
import { createFramebuffer, createTexture } from './gl/texture';

/** Shadow codes a light can carry in `LightUniforms.shadow`. A value of 0 or more is a static tile. */
export const SHADOW_NONE = -1;
/** Ask for one of the per-frame shadow slots; granted to the most important few. */
export const SHADOW_DYNAMIC = -2;

// Fixed lights (floodlights, lamps, pylons): one wide map each, looking straight down, baked once.
const STATIC_TILE = 640,
    STATIC_COLS = 4,
    STATIC_ROWS = 3,
    STATIC_TAN = 4.7,
    STATIC_NEAR = 1.5,
    STATIC_FAR = 46;
// Moving lights (fires, explosions): four 90-degree side faces each, redrawn every frame.
const DYNAMIC_TILE = 512,
    DYNAMIC_SLOTS = 2,
    DYNAMIC_TAN = 1.06,
    DYNAMIC_NEAR = 0.2,
    DYNAMIC_FAR = 18;
const DYNAMIC_CODE = 100;
/** A slot keeps following a light that moved less than this since last frame, to avoid flicker. */
const STICKY_DISTANCE = 0.75;
/**
 * A moving light without a slot of its own borrows the map of a slot this close to it. A burning
 * puddle is a cluster of small lights; shading them all from one point keeps its shadows crisp
 * where separate unshadowed lights would wash them out.
 */
const SHARE_DISTANCE = 5;

export interface LightPosition {
    x: number;
    y: number;
    z: number;
}
/** Draws every shadow caster with the given view-projection. `staticOnly` leaves out anything that moves. */
type DrawCasters = (viewProj: Mat4, staticOnly: boolean) => void;

let staticTex!: WebGLTexture, staticFbo!: WebGLFramebuffer, dynamicTex!: WebGLTexture, dynamicFbo!: WebGLFramebuffer;
let ready = false,
    baked = false;
let staticLights: LightPosition[] = [];
// position each dynamic slot was following last frame (NaN = free)
const slots = new Float32Array(DYNAMIC_SLOTS * 3).fill(NaN);
const resolved = new Float32Array(16),
    origins = new Float32Array(DYNAMIC_SLOTS * 3);
// index of the light each dynamic slot serves this frame (-1 = none)
const taken = new Int32Array(DYNAMIC_SLOTS);
const view = m4(),
    viewProj = m4();
const staticProj = m4persp(m4(), 2 * Math.atan(STATIC_TAN), 1, STATIC_NEAR, STATIC_FAR),
    dynamicProj = m4persp(m4(), 2 * Math.atan(DYNAMIC_TAN), 1, DYNAMIC_NEAR, DYNAMIC_FAR);

/** Uniform values the shadow lookup in light-shadows.glsl needs. */
export const shadowUniforms = {
    static: [STATIC_TAN, STATIC_NEAR, STATIC_FAR, 0],
    dynamic: [DYNAMIC_TAN, DYNAMIC_NEAR, DYNAMIC_FAR, 0],
    grid: [STATIC_COLS, STATIC_ROWS],
    /** per-light codes for this frame; a dynamic request is replaced by its slot if it got one */
    codes: resolved,
    /** where each dynamic slot's map was drawn from */
    origins,
};

const distance = (pos: Float32Array, i: number, x: number, y: number, z: number) => Math.hypot(pos[i * 4] - x, pos[i * 4 + 1] - y, pos[i * 4 + 2] - z);

function depthAtlas(w: number, h: number): [WebGLTexture, WebGLFramebuffer] {
    const t = createTexture(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    return [t, createFramebuffer(null, t)];
}

/**
 * Registers the lights that never move. The index of each in the array is its shadow code.
 * Returns how many were accepted; the rest stay unshadowed.
 */
export function setStaticLights(lights: LightPosition[]): number {
    staticLights = lights.slice(0, STATIC_COLS * STATIC_ROWS);
    baked = false;
    return staticLights.length;
}

export function shadowTextures() {
    return { static: staticTex, dynamic: dynamicTex };
}

// camera at (x,y,z) with the given right / up / back axes
function lookFrom(x: number, y: number, z: number, rx: number, ry: number, rz: number, ux: number, uy: number, uz: number, bx: number, by: number, bz: number) {
    view.set([rx, ux, bx, 0, ry, uy, by, 0, rz, uz, bz, 0, -(rx * x + ry * y + rz * z), -(ux * x + uy * y + uz * z), -(bx * x + by * y + bz * z), 1]);
}

function tile(x: number, y: number, size: number) {
    gl.viewport(x, y, size, size);
    gl.scissor(x, y, size, size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
}

/**
 * Updates the local-light shadow maps for this frame and resolves which lights get one.
 * `codes` are the shadow codes the simulation asked for, `pos` the light positions (xyz + radius),
 * `dynamicBudget` how many moving lights may cast this frame. Expects depth writes, depth test and
 * polygon offset to be set up by the caller.
 */
export function updateLightShadows(codes: Float32Array, pos: Float32Array, count: number, dynamicBudget: number, drawCasters: DrawCasters) {
    if (!ready) {
        [staticTex, staticFbo] = depthAtlas(STATIC_TILE * STATIC_COLS, STATIC_TILE * STATIC_ROWS);
        [dynamicTex, dynamicFbo] = depthAtlas(DYNAMIC_TILE * 4, DYNAMIC_TILE * DYNAMIC_SLOTS);
        ready = true;
    }
    gl.enable(gl.SCISSOR_TEST);

    if (!baked) {
        // fixed lights only ever see the level, so their maps are drawn once
        gl.bindFramebuffer(gl.FRAMEBUFFER, staticFbo);
        staticLights.forEach((l, i) => {
            tile((i % STATIC_COLS) * STATIC_TILE, Math.floor(i / STATIC_COLS) * STATIC_TILE, STATIC_TILE);
            // looking down -Y: right = +X, up = -Z, back = +Y
            lookFrom(l.x, l.y, l.z, 1, 0, 0, 0, 0, -1, 0, 1, 0);
            drawCasters(m4mul(viewProj, staticProj, view), true);
        });
        baked = true;
    }

    // which moving lights keep or take a slot: a slot stays with the light it was already
    // following where possible, then free slots go to the most important remaining requests
    taken.fill(-1);
    for (let s = 0; s < DYNAMIC_SLOTS; s++) {
        if (s >= dynamicBudget || Number.isNaN(slots[s * 3])) continue;
        for (let i = 0; i < count; i++) {
            if (codes[i] !== SHADOW_DYNAMIC || taken.includes(i)) continue;
            if (distance(pos, i, slots[s * 3], slots[s * 3 + 1], slots[s * 3 + 2]) < STICKY_DISTANCE) {
                taken[s] = i;
                break;
            }
        }
    }
    for (let s = 0; s < DYNAMIC_SLOTS; s++) {
        if (s >= dynamicBudget || taken[s] >= 0) continue;
        for (let i = 0; i < count; i++) {
            if (codes[i] !== SHADOW_DYNAMIC || taken.includes(i)) continue;
            // a light that can share another slot's map does not need its own
            if (taken.some((t) => t >= 0 && distance(pos, i, pos[t * 4], pos[t * 4 + 1], pos[t * 4 + 2]) < SHARE_DISTANCE)) continue;
            taken[s] = i;
            break;
        }
    }

    // fixed lights keep their tile; a moving light stays a request until it is given a slot below
    for (let i = 0; i < 16; i++) {
        const code = i < count ? codes[i] : SHADOW_NONE;
        resolved[i] = code === SHADOW_DYNAMIC || (code >= 0 && code < staticLights.length) ? code : SHADOW_NONE;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, dynamicFbo);
    for (let s = 0; s < DYNAMIC_SLOTS; s++) {
        const i = taken[s];
        if (i < 0) {
            slots[s * 3] = NaN;
            continue;
        }
        const x = (origins[s * 3] = slots[s * 3] = pos[i * 4]),
            y = (origins[s * 3 + 1] = slots[s * 3 + 1] = pos[i * 4 + 1]),
            z = (origins[s * 3 + 2] = slots[s * 3 + 2] = pos[i * 4 + 2]);
        resolved[i] = DYNAMIC_CODE + s;
        for (let face = 0; face < 4; face++) {
            tile(face * DYNAMIC_TILE, s * DYNAMIC_TILE, DYNAMIC_TILE);
            // faces look along +X, -X, +Z, -Z with +Y up
            if (face === 0) lookFrom(x, y, z, 0, 0, 1, 0, 1, 0, -1, 0, 0);
            else if (face === 1) lookFrom(x, y, z, 0, 0, -1, 0, 1, 0, 1, 0, 0);
            else if (face === 2) lookFrom(x, y, z, -1, 0, 0, 0, 1, 0, 0, 0, -1);
            else lookFrom(x, y, z, 1, 0, 0, 0, 1, 0, 0, 0, 1);
            drawCasters(m4mul(viewProj, dynamicProj, view), false);
        }
    }
    // the remaining requests borrow the nearest slot in reach
    for (let i = 0; i < count; i++) {
        if (resolved[i] !== SHADOW_DYNAMIC) continue;
        let best = SHARE_DISTANCE;
        for (let s = 0; s < DYNAMIC_SLOTS; s++) {
            if (taken[s] < 0) continue;
            const d = distance(pos, i, origins[s * 3], origins[s * 3 + 1], origins[s * 3 + 2]);
            if (d < best) {
                best = d;
                resolved[i] = DYNAMIC_CODE + s;
            }
        }
    }
    gl.disable(gl.SCISSOR_TEST);
}
