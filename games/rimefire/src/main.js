import { initGL } from './gl.js';
import { buildWorld, W } from './world.js';
import { initRenderer, render, resize, R, setCamera, cam, post, addInst, clearScorch } from './render.js';
import { buildModels } from './models.js';
import { S, updateParticles, updateLights, updateDebris, clearParticles, sprite, debris } from './fx.js';
import { updateCombat, idleCombat, resetCombat, D, spawnFoe, foes, blobs, fireGel, fireSpark } from './combat.js';
import { updatePlayer, resetPlayer, PL, keys, mouse, swapWeapon, opts } from './player.js';
import { hud } from './hud.js';
import { initAudio, audioTick, sfx, suspendAudio } from './audio.js';
import { clamp, PI } from './math.js';

const canvas = document.getElementById('c');
const DEV = import.meta.env.DEV && location.search.indexOf('dev') >= 0;

function boot() {
    if (!initGL(canvas)) {
        document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:0;display:grid;place-items:center;color:#9be8ff;font:14px system-ui;letter-spacing:.2em;text-align:center">RIMEFIRE NEEDS WEBGL 2<br>enable hardware acceleration or try another browser</p>');
        return;
    }
    buildWorld();
    initRenderer(canvas);
    buildModels();
    const ov = hud.init();
    resetGame();
    setMode('title');

    // ---- input ----
    // pointer lock, with a no-lock fallback for embeds where it is unavailable
    let noLock = false;
    const lock = () => {
        if (noLock) return setMode('play');
        const onErr = (e, raw) => {
            if (raw && e && e.name === 'NotSupportedError') return req(false);
            if (e && e.name === 'WrongDocumentError') {
                noLock = true;
                setMode('play');
            }
        };
        const req = (raw) => {
            try {
                const r = raw ? canvas.requestPointerLock({ unadjustedMovement: true }) : canvas.requestPointerLock();
                if (r && r.catch) r.catch((e) => onErr(e, raw));
            } catch (e) {
                onErr(e, raw);
            }
        };
        req(true);
    };
    const go = () => {
        initAudio();
        sfx.ui();
        if (S.mode === 'dead' || S.mode === 'win') resetGame();
        if (DEV) setMode('play');
        else lock();
    };
    ov.addEventListener('click', go);
    canvas.addEventListener('click', () => {
        if (S.mode === 'play' && document.pointerLockElement !== canvas && !DEV && !noLock) lock();
    });
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) setMode('play');
        else if (S.mode === 'play') setMode('pause');
    });
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === canvas || (noLock && S.mode === 'play')) {
            mouse.dx += e.movementX;
            mouse.dy += e.movementY;
        }
    });
    addEventListener('mousedown', (e) => {
        if (e.button === 0 && S.mode === 'play') mouse.l = true;
        if (e.button === 2 && S.mode === 'play') swapWeapon();
    });
    addEventListener('mouseup', (e) => {
        if (e.button === 0) mouse.l = false;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    let wheelT = 0;
    addEventListener(
        'wheel',
        (e) => {
            if (S.mode === 'play' && performance.now() - wheelT > 180) {
                wheelT = performance.now();
                mouse.wheel = 1;
            }
            e.preventDefault();
        },
        { passive: false }
    );
    addEventListener('keydown', (e) => {
        if (e.repeat) return;
        keys[e.code] = true;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
        if (S.mode !== 'play') return;
        if (e.code === 'Escape' && noLock) setMode('pause');
        else if (e.code === 'KeyQ') swapWeapon();
        else if (e.code === 'Digit1') swapWeapon(0);
        else if (e.code === 'Digit2') swapWeapon(1);
        else if (e.code === 'KeyG') {
            R.quality = (R.quality + 1) % 4;
            R.dyn = 1;
            R.ao = R.quality > 0;
            resize();
            hud.toast('GRAPHICS · ' + ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'][R.quality]);
        } else if (e.code === 'KeyF') showFps = !showFps;
        else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
            opts.sens = clamp(opts.sens * (e.code === 'BracketLeft' ? 0.87 : 1.15), 0.0006, 0.008);
            hud.toast('SENSITIVITY · ' + Math.round((opts.sens / 0.0022) * 100) + '%');
        }
    });
    addEventListener('keyup', (e) => (keys[e.code] = false));
    addEventListener('blur', () => {
        for (const k in keys) keys[k] = false;
        mouse.l = false;
    });
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => suspendAudio(document.hidden));

    if (DEV) window.RF = { S, PL, D, W, R, cam, post, foes, blobs, keys, mouse, spawnFoe, fireGel, fireSpark, setMode, swapWeapon, resetGame, opts, step: frame };
    last = performance.now();
    requestAnimationFrame(frame);
}

let last = 0,
    avg = 16.7,
    cool = 3,
    showFps = false,
    fpsN = 0,
    fpsT = 0,
    tipStage = 0,
    tipT = 0;

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
function setMode(m) {
    S.mode = m;
    hud.overlay(m === 'play' ? null : m, S.stats);
    if (m !== 'play') mouse.l = false;
}

function orbitCam(t, r, h, look) {
    const a = t * 0.045 + 3.6,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
    setCamera(x, h, z, Math.atan2(x, z), look, 0, 1.0);
}
let winFlash = false;

function tips(dt) {
    const p = PL;
    tipT += dt;
    if (tipStage === 0) {
        if (S.stats.time > 1.5) hud.tip('Hold <kbd>LMB</kbd> to coat a target in <kbd>GEL</kbd>', 1);
        if (p.fired > 8) tipStage = 1;
    } else if (tipStage === 1) {
        hud.tip('<kbd>Q</kbd> swaps to the <kbd>STRIKER</kbd> — one spark lights the gel', 1);
        if (S.stats.det > 0) {
            tipStage = 2;
            tipT = 0;
        }
    } else if (tipStage === 2 && tipT > 3.5) {
        if (D.lit === 0) hud.tip('Coat a frozen <kbd>PYLON ◆</kbd> then ignite it to thaw it', 8);
        tipStage = 3;
    }
}

function frame(now) {
    requestAnimationFrame(frame);
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
    updateDebris(dt, addInst);
    updateParticles(dt);
    updateLights(dt, cam.x, cam.y, cam.z);

    const low = m === 'play' && p.hp < 30 ? 1 : 0;
    S.flashFx = Math.max(0, (S.flashFx || 0) - rdt * 0.9);
    post.dmg = (S.dmgFx || 0) * 0.85 + low * (0.28 + 0.1 * Math.sin(now * 0.008));
    post.ca = S.trauma * S.trauma * 0.011 + (S.dmgFx || 0) * 0.007;
    post.desat = m === 'dead' ? 0.75 : low * 0.3;
    post.flash = S.flashFx * S.flashFx;
    hud.update(rdt, D);
    audioTick(rdt, m === 'pause' ? 0 : S.fire, m === 'play' ? clamp(foes.length / 7, 0, 0.8) + (D.boss && !D.won ? 1 : 0) + (D.lit ? 0.15 : 0) : 0, !!D.boss && !D.won);
    render(dt);
}

boot();
