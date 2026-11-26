// GLSL lives in the sibling .glsl files; Vite inlines them as strings (`?raw`).
// The production build strips comments and whitespace from them (see apps/rimefire/vite.config.mts).
import compositeFrag from './composite.frag.glsl?raw';
import gooFrag from './goo.frag.glsl?raw';
import gooVert from './goo.vert.glsl?raw';
import lightShadows from './light-shadows.glsl?raw';
import lightingChunk from './lighting.glsl?raw';
import materialGenFrag from './material-gen.frag.glsl?raw';
import materialPackFrag from './material-pack.frag.glsl?raw';
import scorchStampFrag from './scorch-stamp.frag.glsl?raw';
import scorchStampVert from './scorch-stamp.vert.glsl?raw';
import skyFrag from './sky.frag.glsl?raw';
import snowFrag from './snow.frag.glsl?raw';
import snowVert from './snow.vert.glsl?raw';
import ssaoFrag from './ssao.frag.glsl?raw';
import ssaoApplyFrag from './ssao-apply.frag.glsl?raw';
import ssaoBlurFrag from './ssao-blur.frag.glsl?raw';
import surfaceFrag from './surface.frag.glsl?raw';
import surfaceVert from './surface.vert.glsl?raw';
import volumetricFrag from './volumetric.frag.glsl?raw';
import volumetricApplyFrag from './volumetric-apply.frag.glsl?raw';

// the shaders every kiln renderer shares: full-screen passes, shadow depth, the sky's vertex stage
export { FLAT_FS, FS_VS, SHADOW_FS, SHADOW_VS, SKY_VS } from '@ryqndev/kiln-gl';

// Lit programs prepend the shared lighting chunk (lights, shadows, sky ambient, fog).
const lighting = lightShadows + lightingChunk;
export const UBER_VS = surfaceVert;
export const UBER_FS = lighting + surfaceFrag;
export const GOO_VS = gooVert;
export const GOO_FS = lighting + gooFrag;
export const SNOW_VS = snowVert;
export const SNOW_FS = snowFrag;
export const SKY_FS = skyFrag;
export const COMP_FS = compositeFrag;
export const AO_FS = ssaoFrag;
export const AOBLUR_FS = ssaoBlurFrag;
export const AOAPPLY_FS = ssaoApplyFrag;
export const STAMP_VS = scorchStampVert;
export const STAMP_FS = scorchStampFrag;
export const MATGEN_FS = materialGenFrag;
export const MATPACK_FS = materialPackFrag;
export const VOL_FS = lighting + volumetricFrag;
export const VOLAPPLY_FS = volumetricApplyFrag;
