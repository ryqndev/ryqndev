// GLSL lives in the sibling .glsl files; Vite inlines them as strings (`?raw`).
// The production build strips comments and whitespace from them (see apps/brinewake/vite.config.mts).
import compositeFrag from './composite.frag.glsl?raw';
import foamStampFrag from './foam-stamp.frag.glsl?raw';
import foamStampVert from './foam-stamp.vert.glsl?raw';
import lighting from './lighting.glsl?raw';
import skyFrag from './sky.frag.glsl?raw';
import surfaceFrag from './surface.frag.glsl?raw';
import surfaceVert from './surface.vert.glsl?raw';
import waterFrag from './water.frag.glsl?raw';
import waterVert from './water.vert.glsl?raw';

// the shaders every kiln renderer shares: full-screen passes, shadow depth, the sky's vertex stage
export { FLAT_FS, FS_VS, SHADOW_FS, SHADOW_VS, SKY_VS } from '@ryqndev/kiln-gl';

// Lit programs prepend the shared lighting chunk (sun, lamps, shadows, sky, fog).
export const SURFACE_VS = surfaceVert;
export const SURFACE_FS = lighting + surfaceFrag;
export const WATER_VS = waterVert;
export const WATER_FS = lighting + waterFrag;
export const SKY_FS = lighting + skyFrag;
export const FOAM_VS = foamStampVert;
export const FOAM_FS = foamStampFrag;
export const COMP_FS = compositeFrag;
