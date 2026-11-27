import { audioTick, initAudio, sfx, suspendAudio } from '@ryqndev/brinewake-audio';
import { cam, clearFoam, env, type Frame, initGL, initRenderer, post, R, render, resize, setCamera, setDayPhase, setScene, setTerrainMap } from '@ryqndev/brinewake-renderer';
import { attachInput, createFpsMeter, createResolutionGovernor, type Input, keys, listen, mouse, opts } from '@ryqndev/kiln-core';
import { clamp, damp, smooth, TAU } from '@ryqndev/kiln-math';

import { clearParticles, debris, foam, gpu, light, lightU, pcount, sprite, updateDebris, updateLights, updateParticles } from './fx';
import { hud } from './hud';
import { buildModels } from './models';
import { moor, orbitCamera, placeCamera, playerKey, spawnPlayer, updatePlayer } from './player';
import { clearProgress, loadProgress, saveProgress } from './save';
import { balls, D, fireBroadside, FOES, forts,hurtShip, INFAMY, infamyOf, loot, makeShip, resetDirector, resetShips, ships, TEAM, updateShips } from './ships';
import { shipStats } from './ships/fittings';
import { launchEscort, previewBuild, restock } from './shipyard';
import { type Mode, newProgress, PL, S } from './state';
import { buildTownLife, updateTown } from './town';
import { buildWorld, height, hmap, HN, W } from './world';

export interface GameOptions {
    /** Exposes a `window.BW` handle and starts play without pointer lock, so scripts can drive the game. */
    debug?: boolean;
    /** Opens straight into the drydock instead of the title screen. */
    drydock?: boolean;
}

/** What the drydock's yard will stand a build: enough for everything it sells, many times over. */
const DRYDOCK_PURSE = 1_000_000;

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
    showFps = false,
    tipStage = 0,
    tipT = 0,
    // seconds under sail since the anchor last came up
    atSea = 0,
    // counts up once the admiral is beaten, until the victory screen
    winT = -1;

// debug: a fixed viewpoint for looking the world over, as [x, y, z, yaw, pitch, fov]
const spy: { view: number[] | null } = { view: null };

const governor = createResolutionGovernor(R, resize);
const fpsMeter = createFpsMeter();

// The circling camera's stand-off, height and sideways slide (as a fraction of the stand-off). They
// follow what the scene asks for instead of jumping to it: the ship can change size under the
// camera in a single frame, when the yard tries another hull on her.
const orbit = { r: 0, v: 0, h: 0, aside: 0, on: false };
/** How briskly the stand-off closes on its target, rad/s: about three quarters of a second to settle. */
const ORBIT_SPRING = 6.5;

/**
 * How the player has turned the ship round in the yard: a heading added to the camera's slow
 * circling, a tilt added to its elevation, and a zoom on its distance. Dragging the view holds the
 * circling still; it picks up again once the view has been left alone for LOOK_REST seconds.
 */
const look = { yaw: 0, tilt: 0, zoom: 1, idle: 99, held: false, x: 0, y: 0 };
const LOOK_REST = 5;
/** Radians the view turns for each pixel dragged, sideways and up or down. */
const LOOK_TURN = 0.006,
    LOOK_TILT = 0.004;

// drag on the sea to turn the ship round, wheel to come closer or stand off, double-click to let go
function attachLook(canvas: HTMLCanvasElement): (() => void)[] {
    const release = () => {
        look.held = false;
        canvas.style.cursor = S.mode === 'port' ? 'grab' : '';
    };
    return [
        listen(canvas, 'pointerdown', (e) => {
            if (S.mode !== 'port' || e.button !== 0) return;
            look.held = true;
            look.x = e.clientX;
            look.y = e.clientY;
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = 'grabbing';
        }),
        listen(canvas, 'pointermove', (e) => {
            if (!look.held) return;
            // the ship follows the hand: dragging right brings her far side round, dragging down looks from higher
            look.yaw -= (e.clientX - look.x) * LOOK_TURN;
            look.tilt = clamp(look.tilt + (e.clientY - look.y) * LOOK_TILT, -1.4, 1.4);
            look.x = e.clientX;
            look.y = e.clientY;
            look.idle = 0;
        }),
        listen(canvas, 'pointerup', release),
        listen(canvas, 'pointercancel', release),
        listen(
            canvas,
            'wheel',
            (e) => {
                if (S.mode !== 'port') return;
                // by how far the wheel moved, so a trackpad's stream of small steps zooms as gently as a
                // mouse wheel's few big ones (a wheel reporting in lines, not pixels, is scaled to match)
                const travel = clamp(e.deltaY * (e.deltaMode === 1 ? 33 : 1), -150, 150);
                look.zoom = clamp(look.zoom * Math.exp(travel * 0.0012), 0.35, 2.4);
                look.idle = 0;
                e.preventDefault();
            },
            { passive: false }
        ),
        listen(canvas, 'dblclick', () => {
            if (S.mode !== 'port') return;
            look.tilt = 0;
            look.zoom = 1;
            look.idle = LOOK_REST;
        }),
    ];
}

function easeOrbit(r: number, h: number, aside: number, dt: number, brisk = false) {
    // the first frame of circling starts where it is asked to: there is nothing to ease from
    if (!orbit.on) {
        orbit.r = r;
        orbit.v = 0;
        orbit.h = h;
        orbit.aside = aside;
        return;
    }
    // a critically damped spring: it sets off gently as well as arriving gently, and never overshoots
    // while the player has hold of the view it keeps close under the hand; left alone it drifts
    const w = brisk ? ORBIT_SPRING * 2.6 : ORBIT_SPRING;
    orbit.v += ((r - orbit.r) * w - 2 * orbit.v) * w * dt;
    orbit.r += orbit.v * dt;
    orbit.h = damp(orbit.h, h, brisk ? 14 : 3, dt);
    orbit.aside = damp(orbit.aside, aside, 3, dt);
}

// the renderer's view of the simulation; every buffer is reused across frames
const frameInput: Frame = { time: 0, dt: 0, lights: lightU, particles: gpu, particleCount: 0, foam, focusX: 0, focusZ: 0 };

/**
 * Mounts the game on a canvas and starts its loop. Returns a function that stops the loop and
 * removes every listener; mounting again on the same canvas resumes where it left off.
 */
export function mountGame(canvas: HTMLCanvasElement, { debug = false, drydock = false }: GameOptions = {}): () => void {
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
            buildTownLife();
            resetVoyage();
            setMode('title');
            if (drydock) enterDrydock();
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
    const off = [listen(window, 'resize', resize), listen(document, 'visibilitychange', () => suspendAudio(document.hidden)), ...attachLook(canvas)];
    if (debug) {
        (window as unknown as Record<string, unknown>).BW = { S, PL, W, R, D, cam, post, env, ships, loot, balls, keys, mouse, opts, FOES, TEAM, makeShip, hurtShip, fireBroadside, setMode, dock, resetVoyage, height, spy, forts };
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
    previewBuild(null);
    if (S.mode === 'port' || S.mode === 'title') atSea = 0;
    input.engage();
}

/** Drops anchor at the home port: banks the hold, repairs the hull and opens the shipyard. */
export function dock() {
    if (S.mode !== 'play' || !PL.canDock) return;
    // the purser makes the most of the hold, and the crew take their shares before the captain sees any
    const s = PL.ship,
        { bank, share } = shipStats(S.prog),
        gross = Math.round(S.hold * bank),
        cut = Math.round(gross * share),
        banked = gross - cut;
    s.sail = 0;
    s.rudder = 0;
    s.hp = s.max;
    S.prog.gold += banked;
    S.prog.stats.plunder += banked;
    S.hold = 0;
    restock();
    saveProgress();
    setMode('port');
    sfx.bell();
    if (gross) hud.banner('PLUNDER BANKED', banked + ' gold ashore' + (cut ? ' · ' + cut + ' to the crew' : ''));
    if (document.pointerLockElement) document.exitPointerLock();
}

// swaps the career for a throwaway one with a bare sloop and a bottomless purse, and opens the yard
function enterDrydock() {
    S.drydock = true;
    S.prog = { ...newProgress(), gold: DRYDOCK_PURSE };
    resetVoyage();
    setMode('port');
}

/**
 * Opens the drydock from the title screen: the shipyard as a mode of its own, where anything can
 * be bought and fitted, and taken to sea to try. The real career is left exactly as it was.
 * Call from a click handler, so the yard has its sounds.
 */
export function openDrydock() {
    if (!supported || !bound || S.mode !== 'title') return;
    initAudio();
    sfx.ui();
    enterDrydock();
}

/** Leaves the drydock for the title screen, with the real career back in hand. */
export function leaveDrydock() {
    if (!S.drydock) return;
    S.drydock = false;
    S.prog = loadProgress();
    resetVoyage();
    setMode('title');
    if (document.pointerLockElement) document.exitPointerLock();
}

/** Throws the save away and starts over from a bare sloop. */
export function resetProgress() {
    // the drydock has no save of its own to throw away, and must not reach the real one
    if (!supported || !bound || S.drydock) return;
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
        governor.reset();
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
    // in the yard the sea is there to be dragged: it turns the ship round
    look.held = false;
    if (bound) bound.style.cursor = m === 'port' ? 'grab' : '';
    if (m !== 'play') mouse.l = mouse.r = false;
    // in port she lies alongside the wharf, wherever in the roads she dropped anchor
    if (m === 'port') moor();
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

    governor.tick(rdt);
    if (showFps) {
        const fps = fpsMeter(rdt);
        if (fps !== null) hud.fps(fps + ' fps · ' + R.w + '×' + R.h);
    } else hud.fps('');

    const m = S.mode,
        p = PL.ship;
    PL.dress = damp(PL.dress, m === 'port' ? 1 : 0, 2.5, rdt);
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
        if (m === 'port') moor(rdt);
        const wide = m === 'title' || m === 'win';
        // in port the shipyard takes the right of the screen: the ship is framed in what is left
        let radius = p.hl * 2 + (wide ? 34 : 24),
            rise = wide ? 13 : 9 + Math.min(16, S.deadT * 1.5);
        const handled = m === 'port' && (look.held || look.idle < LOOK_REST);
        if (m === 'port') {
            // the player's own view of her: the same circle, tilted and stood off as they have set it,
            // and held still for as long as they are looking
            const far = Math.hypot(radius, rise) * look.zoom,
                tilt = clamp(Math.atan2(rise, radius) + look.tilt, 0.03, 1.35);
            radius = far * Math.cos(tilt);
            rise = far * Math.sin(tilt);
            look.idle += rdt;
            if (handled) look.yaw -= 0.05 * dt;
        }
        easeOrbit(radius, rise, m === 'port' ? 0.2 : 0, rdt, handled);
        orbitCamera(p.x, 5, p.z, orbit.r, orbit.h, S.t * 0.05 + W.port.yaw + 2.4 + look.yaw, orbit.r * orbit.aside);
        updateShips(dt, false);
    }
    orbit.on = m !== 'play' && m !== 'pause';

    // lanterns ashore, lit from dusk to dawn
    if (env.lamp > 0.05)
        for (const l of W.lights) {
            light(l.x, l.y, l.z, l.r * env.lamp, l.g * env.lamp, l.b * env.lamp, l.rad);
            sprite(0, l.x, l.y, l.z, l.glow * 0.4, l.r * 0.3, l.g * 0.3, l.b * 0.3, env.lamp);
            sprite(0, l.x, l.y, l.z, l.glow * 2, l.r * 0.012, l.g * 0.012, l.b * 0.012, env.lamp);
        }
    updateTown(dt);
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
    // in the roads the sun's shadows are shared between the ship and the town behind her
    const ashore = 0.5 * smooth(420, 190, Math.hypot(p.x - W.port.tx, p.z - W.port.tz));
    frameInput.focusX = p.x + (W.port.tx - p.x) * ashore;
    frameInput.focusZ = p.z + (W.port.tz - p.z) * ashore;
    if (spy.view) {
        const [x, y, z, yaw, pitch, fov = 1] = spy.view;
        setCamera(x, y, z, yaw, pitch, 0, fov);
        frameInput.focusX = x - Math.sin(yaw) * 90;
        frameInput.focusZ = z - Math.cos(yaw) * 90;
    }
    render(frameInput);
}
