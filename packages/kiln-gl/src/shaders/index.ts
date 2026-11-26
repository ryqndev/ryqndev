// GLSL lives in the sibling .glsl files; Vite inlines them as strings (`?raw`).
// A game's production build strips their comments and whitespace (see its vite.config.mts).
import bloomDownFrag from './bloom-down.frag.glsl?raw';
import bloomUpFrag from './bloom-up.frag.glsl?raw';
import flatFrag from './flat.frag.glsl?raw';
import fullscreenVert from './fullscreen.vert.glsl?raw';
import fxaaFrag from './fxaa.frag.glsl?raw';
import particleFrag from './particle.frag.glsl?raw';
import particleVert from './particle.vert.glsl?raw';
import shadowFrag from './shadow.frag.glsl?raw';
import shadowVert from './shadow.vert.glsl?raw';
import skyVert from './sky.vert.glsl?raw';

/** Vertex stage of every full-screen pass: hands the fragment shader `vUV`. */
export const FS_VS = fullscreenVert;
/** Fills with `uCol`. */
export const FLAT_FS = flatFrag;
/**
 * Depth-only pass for shadow maps. Reads a mesh's position from attribute 0 and, built with
 * `#define INST`, an instance's model matrix rows from attributes 4 to 6.
 */
export const SHADOW_VS = shadowVert;
export const SHADOW_FS = shadowFrag;
/** Vertex stage of a sky drawn on the full-screen triangle: unprojects with `uIVP` into the view ray `vD`. */
export const SKY_VS = skyVert;

// used by this package's own passes (post.ts, particles.ts)
export const DOWN_FS = bloomDownFrag;
export const UP_FS = bloomUpFrag;
export const FXAA_FS = fxaaFrag;
export const PART_VS = particleVert;
export const PART_FS = particleFrag;
