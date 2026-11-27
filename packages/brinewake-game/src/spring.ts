// A critically damped spring, stepped in closed form: it reaches for its goal as fast as anything can
// that never overshoots, keeps its speed from one frame to the next, and is as steady at ten frames a
// second as at two hundred. It is tuned by one number that means something: the time it takes to
// close half of what is left.
//
// After the `simple_spring_damper_exact` of Daniel Holden's Motion-Matching demo (MIT licence,
// github.com/orangeduck/Motion-Matching, spring.h) and his notes on springs for game animation.

/** Something sprung: where it is, and how fast it is moving. */
export interface Spring {
    x: number;
    v: number;
}

export const newSpring = (x = 0): Spring => ({ x, v: 0 });

/** Half the damping that closes half the distance in `halflife` seconds. */
export const stiffness = (halflife: number) => (2 * Math.LN2) / (halflife + 1e-5);

/** Moves a spring on by `dt` seconds toward `goal`, and returns where it now is. */
export function springTo(s: Spring, goal: number, halflife: number, dt: number) {
    const y = stiffness(halflife),
        j0 = s.x - goal,
        j1 = s.v + j0 * y,
        e = Math.exp(-y * dt);
    s.x = e * (j0 + j1 * dt) + goal;
    s.v = e * (s.v - j1 * y * dt);
    return s.x;
}
