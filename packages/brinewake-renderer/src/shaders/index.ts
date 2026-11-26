// GLSL lives in the sibling .glsl files; Vite inlines them as strings (`?raw`).
// The production build strips comments and whitespace from them (see apps/brinewake/vite.config.mts).
import bloomDownFrag from './bloom-down.frag.glsl?raw';
import bloomUpFrag from './bloom-up.frag.glsl?raw';
import compositeFrag from './composite.frag.glsl?raw';
import flatFrag from './flat.frag.glsl?raw';
import foamStampFrag from './foam-stamp.frag.glsl?raw';
import foamStampVert from './foam-stamp.vert.glsl?raw';
import fullscreenVert from './fullscreen.vert.glsl?raw';
import fxaaFrag from './fxaa.frag.glsl?raw';
import lighting from './lighting.glsl?raw';
import particleFrag from './particle.frag.glsl?raw';
import particleVert from './particle.vert.glsl?raw';
import shadowFrag from './shadow.frag.glsl?raw';
import shadowVert from './shadow.vert.glsl?raw';
import skyFrag from './sky.frag.glsl?raw';
import skyVert from './sky.vert.glsl?raw';
import surfaceFrag from './surface.frag.glsl?raw';
import surfaceVert from './surface.vert.glsl?raw';
import waterFrag from './water.frag.glsl?raw';
import waterVert from './water.vert.glsl?raw';

// Lit programs prepend the shared lighting chunk (sun, lamps, shadows, sky, fog).
export const SURFACE_VS = surfaceVert;
export const SURFACE_FS = lighting + surfaceFrag;
export const WATER_VS = waterVert;
export const WATER_FS = lighting + waterFrag;
export const SKY_VS = skyVert;
export const SKY_FS = lighting + skyFrag;
export const SHADOW_VS = shadowVert;
export const SHADOW_FS = shadowFrag;
export const PART_VS = particleVert;
export const PART_FS = particleFrag;
export const FOAM_VS = foamStampVert;
export const FOAM_FS = foamStampFrag;
export const FS_VS = fullscreenVert;
export const FLAT_FS = flatFrag;
export const DOWN_FS = bloomDownFrag;
export const UP_FS = bloomUpFrag;
export const COMP_FS = compositeFrag;
export const FXAA_FS = fxaaFrag;
