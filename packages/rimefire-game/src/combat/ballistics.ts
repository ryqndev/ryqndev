/** Muzzle speed of a gel shot (m/s) and the gravity it falls under (m/s²). */
export const GEL_SPEED = 34;
export const GEL_GRAVITY = 15;

/**
 * How far along the crosshair ray a gel shot is aimed. A target nearer than this is hit exactly;
 * anything further, or empty sky, is treated as a point this far along the ray and the shot is
 * lobbed through it.
 *
 * Without the cap, compensating for a target 70 m out needs a 30°+ launch angle, so nudging the
 * crosshair from mid-distance ground up to the horizon made the shot leap skyward. The value stays
 * under v² / 2g (38.5 m), the height reachable straight up, so a solution exists at every pitch.
 */
export const GEL_AIM_RANGE = 36;

/** Closer than this horizontally the shot goes straight at the point (aiming straight up or down). */
const MIN_HORIZONTAL = 0.6;

export interface Velocity {
    x: number;
    y: number;
    z: number;
}

/**
 * Launch velocity that carries a gel shot from the muzzle through a point at (dx, dy, dz) from it,
 * using the flatter of the two possible arcs. Writes into `out`.
 */
export function lobVelocity(dx: number, dy: number, dz: number, out: Velocity): Velocity {
    const v = GEL_SPEED,
        g = GEL_GRAVITY,
        h = Math.hypot(dx, dz);
    if (h < MIN_HORIZONTAL) {
        const l = Math.hypot(dx, dy, dz) || 1;
        out.x = (dx / l) * v;
        out.y = (dy / l) * v;
        out.z = (dz / l) * v;
        return out;
    }
    const v2 = v * v,
        disc = v2 * v2 - g * (g * h * h + 2 * dy * v2);
    // out of reach: use the angle that carries furthest along that line of sight, which is also
    // what the in-reach solution approaches at the limit, so there is no jump between the two
    const angle = disc >= 0 ? Math.atan((v2 - Math.sqrt(disc)) / (g * h)) : Math.PI / 4 + Math.atan2(dy, h) / 2;
    const flat = (v * Math.cos(angle)) / h;
    out.x = dx * flat;
    out.y = v * Math.sin(angle);
    out.z = dz * flat;
    return out;
}
