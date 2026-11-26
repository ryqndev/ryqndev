import { audioTick, initAudio, sfx, suspendAudio } from '@ryqndev/brinewake-audio';
import { cam, clearFoam, env, type Frame, initGL, initRenderer, post, R, render, resize, setDayPhase, setScene, setTerrainMap } from '@ryqndev/brinewake-renderer';
import { clamp, TAU } from '@ryqndev/rimefire-math';

import { listen } from './dom';
import { clearParticles, debris, foam, gpu, light, lightU, pcount, sprite, updateDebris, updateLights, updateParticles } from './fx';
import { hud } from './hud';
import { attachInput, type Input, keys, mouse, opts } from './input';
import { buildModels } from './models';
import { orbitCamera, placeCamera, playerKey, spawnPlayer, updatePlayer } from './player';
import { clearProgress, loadProgress, saveProgress } from './save';
import { balls, D, fireBroadside, FOES, hurtShip, INFAMY, infamyOf, loot, makeShip, resetDirector, resetShips, ships, TEAM, updateShips } from './ships';
import { launchEscort } from './shipyard';
import { type Mode, newProgress, PL, S } from './state';
import { buildWorld, hmap, HN, W } from './world';

export interface GameOptions {
    /** Exposes a `window.BW` handle and starts play without pointer lock, so scripts can drive the game. */
    debug?: boolean;
}

const QUALITY_NAMES = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
const DEFAULT_SENS = 0.0022;
/** Seconds the sun, then the moon, takes to cross the sky. */
const DAYLIGHT = 280,
    NIGHT = 110;
/** A pirate sunk is fished out at the pier; the navy within this many metres of it is sent on its way first. */
const HARBOUR_APPROACHES = 380;

// One game per page: the engine is initialised once and then only attached / detached.
let bound: HTMLCanvasElement | null = null;
let supported = true;
let input: Input | null = null;
let rafId = 0;

let last = 0,
    avg = 16.7,
    pace = 16.7,
    // smoothed frame time when resolution was last cut, while that cut is on trial
    shedFrom = 0,
    cool = 3,
    showFps = false,
    fpsN = 0,
    fpsT = 0,
    tipStage = 0,
    tipT = 0,
    // seconds under sail since the anchor last came up
    atSea = 0,
    // counts up once the admiral is beaten, until the victory screen
    winT = -1;

// the renderer's view of the simulation; every buffer is reused across frames
const frameInput: Frame = { time: 0, dt: 0, lights: lightU, particles: gpu, particleCount: 0, foam, focusX: 0, focusZ: 0 };

/**
 * Mounts the game on a canvas and starts its loop. Returns a function that stops the loop and
 * removes every listener; mounting again on the same canvas resumes where it left off.
 */
export function mountGame(canvas: HTMLCanvasElement, { debug = false }: GameOptions = {}): () => void {
    if (bound && bound !== canvas) throw new Error('brinewake: the game can only be mounted on one canvas per page');
    if (!bound) {
        bound = canvas;
        if (initGL(canvas)) {
            S.prog = loadProgress();
            buildWorld();
            setScene(W.mesh.props, W.mesh.terrain);
            setTerrainMap(hmap, HN);
            initRenderer(canvas);
            buildModels();
            resetVoyage();
            setMode('title');
        } else {
            supported = false;
            hud.mode('unsupported');
        }
    }
    if (!supported) return () => {};

    input = attachInput({
        canvas,
        skipLock: debug,
        playing: () => S.mode === 'play',
        onEngage: () => setMode('play'),
        onRelease: () => setMode('pause'),
        onKey,
    });
    const off = [listen(window, 'resize', resize), listen(document, 'visibilitychange', () => suspendAudio(document.hidden))];
    if (debug) {
        (window as unknown as Record<string, unknown>).BW = { S, PL, W, R, D, cam, post, env, ships, loot, balls, keys, mouse, opts, FOES, TEAM, makeShip, hurtShip, fireBroadside, setMode, dock, resetVoyage };
    }
    last = performance.now();
    rafId = requestAnimationFrame(frame);

    return () => {
        cancelAnimationFrame(rafId);
        input?.dispose();
        input = null;
        for (const remove of off) remove();
    };
}

/** Starts or resumes play, or puts back to sea from port. Call from a click handler: it needs a user gesture for audio and pointer lock. */
export function beginGame() {
    if (!input) return;
    initAudio();
    sfx.ui();
    if (S.mode === 'dead') relaunch();
    if (S.mode === 'port' || S.mode === 'title') atSea = 0;
    input.engage();
}

/** Drops anchor at the home port: banks the hold, repairs the hull and opens the shipyard. */
export function dock() {
    if (S.mode !== 'play' || !PL.canDock) return;
    const s = PL.ship,
        banked = Math.round(S.hold);
    s.sail = 0;
    s.rudder = 0;
    s.hp = s.max;
    S.prog.gold += banked;
    S.prog.stats.plunder += banked;
    S.hold = 0;
    saveProgress();
    setMode('port');
    sfx.bell();
    if (banked) hud.banner('PLUNDER BANKED', banked + ' gold ashore');
    if (document.pointerLockElement) document.exitPointerLock();
}

/** Throws the save away and starts over from a bare sloop. */
export function resetProgress() {
    if (!supported || !bound) return;
    clearProgress();
    S.prog = newProgress();
    S.day = 0.07;
    resetVoyage();
    setMode('title');
}

// a fresh sea: the player at anchor off the pier with whatever they own, and the opening traffic
function resetVoyage() {
    resetShips();
    clearParticles();
    debris.length = 0;
    clearFoam();
    S.hold = S.trauma = S.dmgFx = S.flashFx = S.deadT = 0;
    tipStage = tipT = atSea = 0;
    winT = -1;
    spawnPlayer();
    for (let i = 0; i < S.prog.escorts; i++) launchEscort(i);
    resetDirector(PL.ship);
}

// after being sunk: the hold is gone and the bounty lapses a level, but the ship and its fittings are kept
function relaunch() {
    const wreck = ships.indexOf(PL.ship);
    if (wreck >= 0) ships.splice(wreck, 1);
    S.prog.renown = INFAMY[Math.max(0, infamyOf(S.prog.renown) - 1)];
    D.level = infamyOf(S.prog.renown);
    for (let i = ships.length - 1; i >= 0; i--) {
        const s = ships[i];
        if (s.team !== TEAM.NAVY || Math.hypot(s.x - W.port.x, s.z - W.port.z) > HARBOUR_APPROACHES) continue;
        // the admiral is not so easily shaken off: he stands out to sea rather than leaving it
        if (s === D.flagship) {
            const far = W.routes.reduce((a, b) => (Math.hypot(b[0] - W.port.x, b[1] - W.port.z) > Math.hypot(a[0] - W.port.x, a[1] - W.port.z) ? b : a));
            s.x = far[0];
            s.z = far[1];
        } else ships.splice(i, 1);
    }
    S.hold = S.dmgFx = 0;
    spawnPlayer();
    saveProgress();
}

function onKey(code: string) {
    if (code === 'KeyF') dock();
    else if (code === 'KeyG') {
        R.quality = (R.quality + 1) % QUALITY_NAMES.length;
        R.dyn = 1;
        shedFrom = 0;
        resize();
        hud.toast('GRAPHICS · ' + QUALITY_NAMES[R.quality]);
    } else if (code === 'KeyP') showFps = !showFps;
    else if (code === 'BracketLeft' || code === 'BracketRight') {
        opts.sens = clamp(opts.sens * (code === 'BracketLeft' ? 0.87 : 1.15), 0.0006, 0.008);
        hud.toast('SENSITIVITY · ' + Math.round((opts.sens / DEFAULT_SENS) * 100) + '%');
    } else playerKey(code);
}

function setMode(m: Mode) {
    S.mode = m;
    hud.mode(m);
    if (m !== 'play') mouse.l = mouse.r = false;
}

// onboarding hints, advanced by what the player has actually done
function tips(dt: number) {
    tipT += dt;
    if (tipStage === 0) {
        if (tipT > 1) hud.tip('sail', 1);
        if (PL.ship.sail > 0) tipStage = 1;
    } else if (tipStage === 1) {
        if (atSea > 6) hud.tip('aim', 1);
        if (PL.fired > 0) {
            tipStage = 2;
            tipT = 0;
        }
    } else if (tipStage === 2) {
        if (tipT > 3 && tipT < 14) hud.tip('plunder', 1);
        if (S.hold > 0) {
            tipStage = 3;
            tipT = 0;
        }
    } else if (tipStage === 3) {
        if (tipT < 9) hud.tip('bank', 1);
        else tipStage = 4;
    }
    // back in the anchorage with something to bank or mend
    if (PL.canDock && atSea > 15) hud.tip('dock', 0.6);
}

// how hard the player is being pressed, for the music: navy ships engaged close by
function threat(): number {
    const p = PL.ship;
    let n = 0;
    for (const s of ships) if (s.team === TEAM.NAVY && !s.dead && (s.x - p.x) ** 2 + (s.z - p.z) ** 2 < 330 * 330) n += s === D.flagship ? 1 : 0.4;
    return Math.min(1.2, n);
}

function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    const rdt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;

    // Dynamic resolution: shed pixels when frames run long, creep back when there is headroom.
    // `pace` is the frame time to hold: 60 Hz, unless the display itself turns out to be slower.
    // A 30 Hz power-saving cap looks exactly like a struggling GPU, so each cut is checked a moment
    // later: if it bought nothing, the display is the limit, and the pixels are given back.
    avg += (rdt * 1000 - avg) * 0.06;
    pace = Math.max(16.7, Math.min(pace, avg));
    cool -= rdt;
    if (shedFrom > 0) {
        if (cool <= 0) {
            if (avg > shedFrom * 0.94) {
                pace = avg;
                R.dyn = Math.min(1, R.dyn + 0.1);
                resize();
            }
            shedFrom = 0;
            cool = 1.5;
        }
    } else if (avg > pace * 1.29 && cool <= 0 && R.dyn > 0.56) {
        shedFrom = avg;
        R.dyn = Math.max(0.55, R.dyn - 0.1);
        resize();
        cool = 1.5;
    } else if (avg < pace * 1.035 && cool < -12 && R.dyn < 1) {
        R.dyn = Math.min(1, R.dyn + 0.05);
        resize();
        cool = 2;
    }
    if (showFps) {
        fpsN++;
        if ((fpsT += rdt) > 0.5) {
            hud.fps(Math.round(fpsN / fpsT) + ' fps · ' + R.w + '×' + R.h);
            fpsN = fpsT = 0;
        }
    } else hud.fps('');

    const m = S.mode,
        p = PL.ship;
    const dt = m === 'pause' ? 0 : m === 'dead' ? rdt * 0.5 : rdt;
    S.t += dt;
    // night passes quicker than day: it is a mood, not a place to get lost in
    S.day = (S.day + dt / (Math.sin(S.day * TAU) >= 0 ? 2 * DAYLIGHT : 2 * NIGHT)) % 1;
    setDayPhase(S.day);

    if (m === 'play') {
        atSea += dt;
        S.prog.stats.time += dt;
        updatePlayer(dt);
        updateShips(dt, true);
        tips(dt);
        if (D.flagship?.dead && !S.prog.won) {
            S.prog.won = true;
            S.flashFx = 1;
            winT = 0;
            saveProgress();
        }
        if (p.dead) {
            S.deadT = 0;
            setMode('dead');
            if (document.pointerLockElement) document.exitPointerLock();
        } else if (winT >= 0 && (winT += dt) > 6) {
            winT = -1;
            D.flagship = null;
            sfx.win();
            setMode('win');
            if (document.pointerLockElement) document.exitPointerLock();
        }
    } else if (m === 'pause') {
        // re-submit the frozen scene so it keeps drawing
        placeCamera(0);
        updateShips(0, false);
    } else {
        // nobody is at the helm: the world carries on, and the camera circles the ship
        if (m === 'dead') S.deadT += rdt;
        else p.rudder = 0;
        const wide = m === 'title' || m === 'win';
        orbitCamera(p.x, 5, p.z, p.hl * 2 + (wide ? 34 : 24), wide ? 13 : 9 + Math.min(16, S.deadT * 1.5), S.t * 0.05 + W.port.yaw + 2.4);
        updateShips(dt, false);
    }

    // lanterns ashore, lit from dusk to dawn
    if (env.lamp > 0.05)
        for (const l of W.lights) {
            light(l.x, l.y, l.z, l.r * env.lamp, l.g * env.lamp, l.b * env.lamp, l.rad);
            sprite(0, l.x, l.y, l.z, l.glow * 0.4, l.r * 0.3, l.g * 0.3, l.b * 0.3, env.lamp);
            sprite(0, l.x, l.y, l.z, l.glow * 2, l.r * 0.012, l.g * 0.012, l.b * 0.012, env.lamp);
        }
    updateDebris(dt);
    updateParticles(dt);
    updateLights(dt, cam.x, cam.y, cam.z);

    const low = m === 'play' && p.hp < p.max * 0.3 ? 1 : 0;
    S.flashFx = Math.max(0, S.flashFx - rdt * 0.9);
    S.dmgFx = Math.max(0, S.dmgFx - rdt * 1.3);
    post.dmg = S.dmgFx * 0.8 + low * (0.22 + 0.08 * Math.sin(now * 0.006));
    post.desat = m === 'dead' ? 0.7 : 0;
    post.flash = S.flashFx * S.flashFx;
    hud.update(rdt);
    audioTick(rdt, m === 'pause' ? 0 : clamp(Math.abs(p.v) / p.speed, 0, 1), m === 'pause' ? 0 : S.fire, m === 'play' ? threat() : 0);

    frameInput.time = S.t;
    frameInput.dt = dt;
    frameInput.particleCount = pcount.n;
    frameInput.focusX = p.x;
    frameInput.focusZ = p.z;
    render(frameInput);
}
