import { audioTick, initAudio, sfx, suspendAudio } from '@ryqndev/rimefire-audio';
import { clamp } from '@ryqndev/rimefire-math';
import { cam, clearScorch, type Frame, initGL, initRenderer, post, R, render, resize, setCamera, setScene } from '@ryqndev/rimefire-renderer';

import { blobs, D, fireGel, fireSpark, foes, idleCombat, resetCombat, spawnFoe, updateCombat } from './combat';
import { goo } from './combat/state';
import { listen } from './dom';
import { clearParticles, debris, gpu, lightU, pcount, sprite, updateDebris, updateLights, updateParticles, updateShockwaves } from './fx';
import { hud } from './hud';
import { attachInput, type Input, keys, mouse, opts } from './input';
import { buildModels } from './models';
import { resetPlayer, swapWeapon, updatePlayer } from './player';
import { type Mode, PL, S } from './state';
import { buildWorld, W } from './world';

export interface GameOptions {
    /** Exposes a `window.RF` handle and starts play without pointer lock, so scripts can drive the game. */
    debug?: boolean;
}

const QUALITY_NAMES = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
const DEFAULT_SENS = 0.0022;

// One game per page: the engine is initialised once and then only attached / detached.
let bound: HTMLCanvasElement | null = null;
let supported = true;
let input: Input | null = null;
let rafId = 0;

let last = 0,
    avg = 16.7,
    cool = 3,
    showFps = false,
    fpsN = 0,
    fpsT = 0,
    tipStage = 0,
    tipT = 0,
    winFlash = false;

// the renderer's view of the simulation; every buffer is reused across frames
const frameInput: Frame = {
    time: 0,
    dt: 0,
    lights: lightU,
    particles: gpu,
    particleCount: 0,
    goo: goo.data,
    gooCount: 0,
    stamps: S.stamps,
    shockwaves: S.sw,
};

/**
 * Mounts the game on a canvas and starts its loop. Returns a function that stops the loop and
 * removes every listener; mounting again on the same canvas resumes where it left off.
 */
export function mountGame(canvas: HTMLCanvasElement, { debug = false }: GameOptions = {}): () => void {
    if (bound && bound !== canvas) throw new Error('rimefire: the game can only be mounted on one canvas per page');
    if (!bound) {
        bound = canvas;
        if (initGL(canvas)) {
            buildWorld();
            setScene(W.mesh.props, W.mesh.terrain);
            initRenderer(canvas);
            buildModels();
            resetGame();
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
        onSecondaryButton: () => swapWeapon(),
    });
    const off = [listen(window, 'resize', resize), listen(document, 'visibilitychange', () => suspendAudio(document.hidden))];
    if (debug) {
        (window as unknown as Record<string, unknown>).RF = { S, PL, D, W, R, cam, post, foes, blobs, keys, mouse, spawnFoe, fireGel, fireSpark, setMode, swapWeapon, resetGame, opts };
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

/** Starts or resumes play. Call from a click handler: it needs a user gesture for audio and pointer lock. */
export function beginGame() {
    if (!input) return;
    initAudio();
    sfx.ui();
    if (S.mode === 'dead' || S.mode === 'win') resetGame();
    input.engage();
}

function onKey(code: string) {
    if (code === 'KeyQ') swapWeapon();
    else if (code === 'Digit1') swapWeapon(0);
    else if (code === 'Digit2') swapWeapon(1);
    else if (code === 'KeyG') {
        R.quality = (R.quality + 1) % QUALITY_NAMES.length;
        R.dyn = 1;
        R.ao = R.quality > 0;
        resize();
        hud.toast('GRAPHICS · ' + QUALITY_NAMES[R.quality]);
    } else if (code === 'KeyF') showFps = !showFps;
    else if (code === 'BracketLeft' || code === 'BracketRight') {
        opts.sens = clamp(opts.sens * (code === 'BracketLeft' ? 0.87 : 1.15), 0.0006, 0.008);
        hud.toast('SENSITIVITY · ' + Math.round((opts.sens / DEFAULT_SENS) * 100) + '%');
    }
}

function resetGame() {
    resetCombat();
    resetPlayer();
    clearParticles();
    debris.length = 0;
    clearScorch();
    S.stats = { det: 0, best: 0, kills: 0, time: 0 };
    S.chain = S.chainT = S.trauma = S.dmgFx = S.slowmo = S.hitStop = S.flashFx = 0;
    S.stamps.length = 0;
    S.sw.length = 0;
    tipStage = tipT = 0;
    winFlash = false;
}

function setMode(m: Mode) {
    S.mode = m;
    hud.mode(m);
    if (m !== 'play') mouse.l = false;
}

// slow orbit around the hub for the title and victory screens
function orbitCam(t: number, r: number, h: number, look: number) {
    const a = t * 0.045 + 3.6,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
    setCamera(x, h, z, Math.atan2(x, z), look, 0, 1.0);
}

// onboarding hints, advanced by what the player has actually done
function tips(dt: number) {
    const p = PL;
    tipT += dt;
    if (tipStage === 0) {
        if (S.stats.time > 1.5) hud.tip('coat', 1);
        if (p.fired > 8) tipStage = 1;
    } else if (tipStage === 1) {
        hud.tip('swap', 1);
        if (S.stats.det > 0) {
            tipStage = 2;
            tipT = 0;
        }
    } else if (tipStage === 2 && tipT > 3.5) {
        if (D.lit === 0) hud.tip('pylon', 8);
        tipStage = 3;
    }
}

function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    const rdt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;

    // dynamic resolution: shed pixels when frames run long, creep back when there is headroom
    avg += (rdt * 1000 - avg) * 0.06;
    cool -= rdt;
    if (avg > 21.5 && cool <= 0 && R.dyn > 0.56) {
        R.dyn = Math.max(0.55, R.dyn - 0.1);
        resize();
        cool = 1.5;
        avg = 17;
    } else if (avg < 17.3 && cool < -12 && R.dyn < 1) {
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

    let dt = rdt;
    if (S.hitStop > 0) {
        S.hitStop -= rdt;
        dt *= 0.08;
    }
    if (S.slowmo > 0) {
        S.slowmo -= rdt;
        dt *= 0.3;
    }
    const m = S.mode,
        p = PL;
    if (m === 'play') {
        S.t += dt;
        S.stats.time += dt;
        updatePlayer(dt);
        updateCombat(dt);
        tips(dt);
        if (p.hp <= 0) {
            p.deadT = 0;
            setMode('dead');
            if (document.pointerLockElement) document.exitPointerLock();
        }
        if (D.won && !winFlash) {
            winFlash = true;
            S.flashFx = 1;
        }
        if (D.won && D.bossT > 4.2) {
            sfx.win();
            setMode('win');
            if (document.pointerLockElement) document.exitPointerLock();
        }
    } else if (m === 'pause') {
        // re-submit the frozen scene so it keeps drawing
        updatePlayer(0);
        updateCombat(0);
        dt = 0;
    } else if (m === 'title') {
        S.t += dt;
        orbitCam(S.t, 34, 9, -0.16);
        idleCombat(dt);
    } else if (m === 'dead') {
        dt *= 0.35;
        S.t += dt;
        p.deadT += rdt;
        const k = Math.min(1, p.deadT / 1.2),
            e = k * k * (3 - 2 * k);
        setCamera(p.x, p.y + 1.66 - 1.25 * e, p.z, p.yaw, p.pitch * (1 - e) + 0.25 * e, 0.9 * e, 1.36);
        updateCombat(dt);
    } else {
        S.t += dt;
        orbitCam(S.t, 26, 8, -0.14);
        updateCombat(dt);
    }
    for (const g of W.glows) {
        const a = g.blink ? (((S.t * 0.7) % 1) > 0.55 ? 1 : 0) : 1;
        if (a) {
            sprite(0, g.x, g.y, g.z, g.s * 0.3, g.r, g.g, g.b, 1);
            sprite(0, g.x, g.y, g.z, g.s * 1.5, g.r * 0.05, g.g * 0.05, g.b * 0.05, 1);
        }
    }
    updateDebris(dt);
    updateParticles(dt);
    updateLights(dt, cam.x, cam.y, cam.z);
    updateShockwaves(dt);

    const low = m === 'play' && p.hp < 30 ? 1 : 0;
    S.flashFx = Math.max(0, S.flashFx - rdt * 0.9);
    post.dmg = S.dmgFx * 0.85 + low * (0.28 + 0.1 * Math.sin(now * 0.008));
    post.ca = S.trauma * S.trauma * 0.011 + S.dmgFx * 0.007;
    post.desat = m === 'dead' ? 0.75 : low * 0.3;
    post.flash = S.flashFx * S.flashFx;
    hud.update(rdt, D);
    audioTick(rdt, m === 'pause' ? 0 : S.fire, m === 'play' ? clamp(foes.length / 7, 0, 0.8) + (D.boss && !D.won ? 1 : 0) + (D.lit ? 0.15 : 0) : 0, !!D.boss && !D.won);

    frameInput.time = S.t;
    frameInput.dt = dt;
    frameInput.particleCount = pcount.n;
    frameInput.gooCount = goo.n;
    render(frameInput);
}
