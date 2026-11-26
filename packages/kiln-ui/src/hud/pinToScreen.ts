/** How far a pinned marker is kept from the screen edges, so it stays clear of the HUD panels. Pixels. */
export interface PinMargins {
    x: number;
    top: number;
    bottom: number;
}

/**
 * Moves a world-anchored marker to its place on screen. `sx` and `sy` are the anchor's position in
 * normalised screen space. An anchor behind the camera is mirrored and pinned low, so the marker
 * points the way to turn. Call it from a frame callback: it writes straight to the element.
 *
 * `zoom` is the HUD's zoom factor: positions are worked out in viewport pixels and must be un-scaled.
 */
export function pinToScreen(el: HTMLElement, sx: number, sy: number, inFront: boolean, zoom: number, margins: PinMargins) {
    const w = window.innerWidth,
        h = window.innerHeight;
    let x = sx * w,
        y = sy * h;
    if (!inFront) {
        x = w - x;
        y = h - 60;
    }
    x = Math.max(margins.x, Math.min(w - margins.x, x));
    y = Math.max(margins.top, Math.min(h - margins.bottom, y));
    el.style.transform = `translate(${(x / zoom) | 0}px,${(y / zoom) | 0}px)`;
}
