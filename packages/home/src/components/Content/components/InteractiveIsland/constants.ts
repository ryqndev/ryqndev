/**
 * Device pixel ratio range for the Home page canvases.
 *
 * react-three-fiber defaults to [1, 2]. Both canvases are full-screen, so on a
 * 3x phone that is 9x the pixels of a 1x display for a low-poly scene whose
 * look does not need it. 1.5 keeps edges crisp while roughly halving the
 * fragment work on 2x-3x screens.
 */
export const CANVAS_DPR: [min: number, max: number] = [1, 1.5];
