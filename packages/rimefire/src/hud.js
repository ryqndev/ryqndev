import { S } from './fx.js';
import { W } from './world.js';
import { project, cam } from './render.js';

const CSS = `
#hud,#ov{position:fixed;inset:0;pointer-events:none;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif;color:#e8f1fa;user-select:none;-webkit-user-select:none}
#hud{opacity:0;transition:opacity .5s}
#hud.on{opacity:1}
.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.lbl{font-size:10px;letter-spacing:.24em;text-transform:uppercase;opacity:.62}
.xh{position:absolute;left:50%;top:50%;width:0;height:0}
.xh i{position:absolute;background:#fff;box-shadow:0 0 3px rgba(0,0,0,.7);transition:all .12s}
.xh .d{width:3px;height:3px;left:-1.5px;top:-1.5px;border-radius:50%}
.xh .a{width:2px;height:7px;left:-1px;top:-15px}.xh .b{width:2px;height:7px;left:-1px;top:8px}
.xh .c{width:7px;height:2px;left:-15px;top:-1px}.xh .e{width:7px;height:2px;left:8px;top:-1px}
.xh.gel i{background:#8dff73}
.xh.gel .a{top:-21px;height:4px}.xh.gel .b{top:17px;height:4px}.xh.gel .c{left:-21px;width:4px}.xh.gel .e{left:17px;width:4px}
.xh .r{position:absolute;width:26px;height:26px;left:-14px;top:-14px;border:1.5px solid #8dff73;border-radius:50%;opacity:0;transition:opacity .12s;box-shadow:0 0 4px rgba(0,0,0,.5)}
.xh.gel .r{opacity:.85}
.xh.spk i{background:#ffb35c}
.hm{position:absolute;left:50%;top:50%;width:0;height:0;opacity:0}
.hm i{position:absolute;width:11px;height:2px;background:#fff;left:-5.5px;top:-1px}
.hm i:nth-child(1){transform:rotate(45deg) translateX(13px)}.hm i:nth-child(2){transform:rotate(135deg) translateX(13px)}
.hm i:nth-child(3){transform:rotate(225deg) translateX(13px)}.hm i:nth-child(4){transform:rotate(315deg) translateX(13px)}
.hm.k i{background:#ff7a3c;width:15px}
.res{position:absolute;left:50%;top:calc(50% + 34px);transform:translateX(-50%);font-size:10px;letter-spacing:.3em;color:#9be8ff;opacity:0}
.obj{position:absolute;left:28px;top:26px;max-width:340px}
.obj b{display:block;font-size:15px;font-weight:600;letter-spacing:.06em;margin-top:5px;text-shadow:0 1px 8px rgba(0,0,0,.8)}
.pips{display:flex;gap:5px;margin-top:9px}
.pips i{width:26px;height:4px;background:rgba(255,255,255,.2);transition:background .5s,box-shadow .5s}
.pips i.on{background:#ff9a3c;box-shadow:0 0 10px #ff7a1c}
.hp{position:absolute;left:28px;bottom:26px;width:250px}
.hp .v{font-size:30px;font-weight:300;line-height:1}
.bar{height:5px;background:rgba(255,255,255,.14);margin-top:8px;position:relative;overflow:hidden}
.bar u{position:absolute;inset:0;transform-origin:0 50%;background:#e8f1fa;transition:transform .12s}
.hp.low .v{color:#ff5a48}.hp.low .bar u{background:#ff5a48}
.wp{position:absolute;right:28px;bottom:26px;display:flex;gap:10px;align-items:flex-end}
.wc{width:150px;padding:10px 12px 11px;background:rgba(8,14,22,.5);border-top:2px solid rgba(255,255,255,.14);opacity:.45;transform:translateY(6px);transition:all .16s;backdrop-filter:blur(6px)}
.wc.on{opacity:1;transform:none}
.wc .n{font-size:13px;font-weight:600;letter-spacing:.14em;display:flex;justify-content:space-between}
.wc .n span{opacity:.5;font-weight:400}
.wc.g.on{border-color:#8dff73}.wc.g .bar u{background:#8dff73}
.wc.s.on{border-color:#ff9a3c}.wc.s .bar u{background:#ff9a3c}
.wc.dry .bar u{background:#ff5a48}
.boss{position:absolute;left:50%;top:26px;width:min(520px,60vw);transform:translateX(-50%);text-align:center;opacity:0;transition:opacity .6s}
.boss.on{opacity:1}
.boss .bar{height:7px}.boss .bar u{background:linear-gradient(90deg,#ff7a1c,#ffd08a)}
.boss.arm .bar u{background:linear-gradient(90deg,#6fb8e6,#bfeaff)}
.nodes{display:flex;justify-content:center;gap:7px;margin-top:8px}
.nodes i{width:9px;height:9px;transform:rotate(45deg);background:#9be8ff;box-shadow:0 0 8px #49c8ff;transition:all .3s}
.nodes i.x{background:rgba(255,255,255,.15);box-shadow:none}
.ban{position:absolute;left:0;right:0;top:21%;text-align:center;opacity:0;transition:opacity .5s}
.ban.on{opacity:1}
.ban b{display:block;font-size:30px;font-weight:300;letter-spacing:.42em;margin-right:-.42em;text-shadow:0 0 24px rgba(255,150,60,.55),0 2px 10px rgba(0,0,0,.8)}
.ban span{display:block;margin-top:10px;font-size:12px;letter-spacing:.3em;text-transform:uppercase;opacity:.75}
.chain{position:absolute;right:40px;top:38%;text-align:right;opacity:0;transition:opacity .25s}
.chain.on{opacity:1}
.chain b{display:block;font-size:54px;font-weight:200;line-height:1;color:#ffb35c;text-shadow:0 0 22px rgba(255,120,30,.8)}
.tip{position:absolute;left:50%;bottom:17%;transform:translateX(-50%);padding:9px 16px;background:rgba(8,14,22,.55);border-left:2px solid #8dff73;font-size:13px;letter-spacing:.08em;opacity:0;transition:opacity .4s;white-space:nowrap;backdrop-filter:blur(6px)}
.tip.on{opacity:1}
.tip kbd{font:inherit;font-weight:700;color:#8dff73;margin:0 2px}
.mk{position:absolute;left:0;top:0;width:0;height:0;opacity:.9}
.mk i{position:absolute;width:10px;height:10px;left:-5px;top:-5px;border:1.5px solid #ffb35c;transform:rotate(45deg);box-shadow:0 0 8px rgba(255,140,40,.6)}
.mk span{position:absolute;top:11px;left:-30px;width:60px;text-align:center;font-size:10px;letter-spacing:.1em;text-shadow:0 1px 4px #000}
.mk em{position:absolute;top:-22px;left:-22px;width:44px;height:3px;background:rgba(255,255,255,.2);font-style:normal}
.mk em u{position:absolute;inset:0;background:#8dff73;transform-origin:0 50%}
.dd{position:absolute;left:50%;top:50%;width:0;height:0;opacity:0}
.dd i{position:absolute;left:-46px;top:-150px;width:92px;height:26px;border-top:4px solid #ff4a38;border-radius:50%/100% 100% 0 0;filter:drop-shadow(0 0 6px #ff2a18)}
.fps{position:absolute;right:10px;top:8px;font-size:10px;opacity:.5}
#ov{display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;background:radial-gradient(ellipse at 50% 45%,rgba(4,9,16,.25),rgba(2,5,10,.82));transition:opacity .5s;pointer-events:auto;cursor:pointer}
#ov.off{opacity:0;pointer-events:none}
#ov h1{margin:0;font-size:clamp(44px,9vw,128px);font-weight:200;letter-spacing:.34em;margin-right:-.34em;line-height:1;background:linear-gradient(180deg,#f4fbff 20%,#9be8ff 55%,#ff9a3c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 30px rgba(120,200,255,.3))}
#ov h2{margin:0;font-size:clamp(26px,4.4vw,56px);font-weight:200;letter-spacing:.3em;margin-right:-.3em}
#ov p{margin:18px 0 0;font-size:13px;letter-spacing:.34em;text-transform:uppercase;opacity:.8}
#ov .go{margin-top:44px;font-size:13px;letter-spacing:.4em;color:#ffb35c;animation:pl 1.6s ease-in-out infinite}
@keyframes pl{50%{opacity:.35}}
.keys{display:grid;grid-template-columns:auto auto;gap:7px 22px;margin-top:40px;font-size:12px;letter-spacing:.12em;text-align:left;opacity:.85}
.keys kbd{font:inherit;font-weight:700;color:#9be8ff;text-align:right}
.stats{display:flex;gap:44px;margin-top:38px}
.stats div b{display:block;font-size:34px;font-weight:200}
.foot{position:absolute;bottom:22px;left:0;right:0;font-size:10px;letter-spacing:.2em;opacity:.4;text-transform:uppercase}
`;
const KEYS = `<div class="keys"><kbd>WASD</kbd><span>move</span><kbd>MOUSE</kbd><span>aim</span><kbd>LMB</kbd><span>fire</span><kbd>Q / WHEEL / 1 2</kbd><span>swap gelcaster ⇄ striker</span><kbd>SPACE</kbd><span>jump</span><kbd>SHIFT</kbd><span>sprint</span><kbd>G</kbd><span>graphics quality</span><kbd>ESC</kbd><span>pause</span></div>`;

let el = {},
    root,
    ov,
    banT = 0,
    tipT = 0,
    hmT = 0,
    resT = 0,
    ddT = 0,
    ddA = 0,
    lastChain = 0,
    zoom = 1;
const cache = {};
const pj = { x: 0, y: 0, w: 0 };
function set(k, v, fn) {
    if (cache[k] !== v) {
        cache[k] = v;
        fn(v);
    }
}

export const hud = {
    init() {
        const st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);
        root = document.createElement('div');
        root.id = 'hud';
        root.innerHTML = `<div class="xh gel"><i class="d"></i><i class="a"></i><i class="b"></i><i class="c"></i><i class="e"></i><div class="r"></div></div>
<div class="hm"><i></i><i></i><i></i><i></i></div><div class="res">NO EFFECT — GEL FIRST</div><div class="dd"><i></i></div>
<div class="obj"><div class="lbl">Objective</div><b></b><div class="pips"><i></i><i></i><i></i></div></div>
<div class="hp"><div class="lbl">Vitals</div><div class="v mono">100</div><div class="bar"><u></u></div></div>
<div class="wp"><div class="wc g"><div class="n">GELCASTER<span>1</span></div><div class="bar"><u></u></div></div><div class="wc s"><div class="n">STRIKER<span>2</span></div><div class="bar"><u></u></div></div></div>
<div class="boss"><div class="lbl">Colossus</div><div class="bar"><u></u></div><div class="nodes"><i></i><i></i><i></i><i></i></div></div>
<div class="ban"><b></b><span></span></div><div class="chain"><b class="mono"></b><div class="lbl">Chain reaction</div></div>
<div class="tip"></div><div class="mk"><i></i><em><u></u></em><span class="mono"></span></div><div class="mk"><i></i><em><u></u></em><span class="mono"></span></div><div class="mk"><i></i><em><u></u></em><span class="mono"></span></div><div class="fps mono"></div>`;
        document.body.appendChild(root);
        ov = document.createElement('div');
        ov.id = 'ov';
        document.body.appendChild(ov);
        const fit = () => {
            zoom = Math.max(1, Math.min(1.8, innerWidth / 1500));
            root.style.zoom = ov.style.zoom = zoom;
        };
        addEventListener('resize', fit);
        fit();
        const q = (s) => root.querySelector(s),
            qa = (s) => [...root.querySelectorAll(s)];
        el = {
            xh: q('.xh'), hm: q('.hm'), res: q('.res'), dd: q('.dd'), obj: q('.obj b'), pips: qa('.pips i'), hp: q('.hp'), hpv: q('.hp .v'), hpb: q('.hp u'),
            wg: q('.wc.g'), ws: q('.wc.s'), wgb: q('.wc.g u'), wsb: q('.wc.s u'), boss: q('.boss'), bossb: q('.boss u'), nodes: qa('.nodes i'),
            ban: q('.ban'), banb: q('.ban b'), bans: q('.ban span'), chain: q('.chain'), chainb: q('.chain b'), tip: q('.tip'), mk: qa('.mk'), fps: q('.fps'),
        };
        return ov;
    },
    overlay(mode, st) {
        ov.classList.toggle('off', !mode);
        root.classList.toggle('on', !mode || mode === 'pause');
        if (!mode) return;
        const f = (s) => ((s / 60) | 0) + ':' + String((s % 60) | 0).padStart(2, '0');
        const stats = st ? `<div class="stats"><div><b class="mono">${f(st.time)}</b><span class="lbl">Time</span></div><div><b class="mono">${st.det}</b><span class="lbl">Detonations</span></div><div><b class="mono">×${st.best}</b><span class="lbl">Best chain</span></div><div><b class="mono">${st.kills}</b><span class="lbl">Shattered</span></div></div>` : '';
        ov.innerHTML =
            mode === 'title'
                ? `<h1>RIMEFIRE</h1><p>Coat it in gel. Then light it.</p>${KEYS}<div class="go">CLICK TO DEPLOY</div><div class="foot">Everything here is generated in code · desktop · mouse + keyboard</div>`
                : mode === 'pause'
                  ? `<h2>PAUSED</h2>${KEYS}<div class="go">CLICK TO RESUME</div>`
                  : mode === 'dead'
                    ? `<h2>FROZEN OUT</h2><p>The station stays dark</p>${stats}<div class="go">CLICK TO REDEPLOY</div>`
                    : mode === 'win'
                      ? `<h2>STATION REIGNITED</h2><p>The Colossus is slag</p>${stats}<div class="go">CLICK TO RUN IT AGAIN</div>`
                      : `<h2>${mode}</h2>`;
    },
    hit(kill) {
        hmT = kill ? 0.42 : 0.2;
        el.hm.classList.toggle('k', !!kill);
    },
    resist() {
        resT = 1.1;
    },
    dmgDir(a) {
        ddT = 1;
        ddA = a;
    },
    banner(t, s) {
        el.banb.textContent = t;
        el.bans.textContent = s || '';
        el.ban.classList.add('on');
        banT = 3.4;
    },
    tip(html, dur = 5) {
        if (cache.tip !== html) {
            cache.tip = html;
            el.tip.innerHTML = html;
        }
        el.tip.classList.add('on');
        tipT = dur;
    },
    toast(t) {
        this.tip(t, 1.6);
    },
    fps(t) {
        set('fps', t, (v) => (el.fps.textContent = v));
    },
    update(dt, D) {
        const p = S.pl;
        if (banT > 0 && (banT -= dt) <= 0) el.ban.classList.remove('on');
        if (tipT > 0 && (tipT -= dt) <= 0) el.tip.classList.remove('on');
        hmT = Math.max(0, hmT - dt);
        resT = Math.max(0, resT - dt);
        ddT = Math.max(0, ddT - dt * 1.3);
        el.hm.style.opacity = Math.min(1, hmT * 6);
        el.res.style.opacity = Math.min(1, resT * 3);
        el.dd.style.opacity = ddT;
        if (ddT > 0) el.dd.style.transform = `rotate(${(-(ddA - p.yaw) * 180) / Math.PI + 180}deg)`;
        set('w', p.weapon, (v) => {
            el.xh.className = 'xh ' + (v ? 'spk' : 'gel');
            el.wg.classList.toggle('on', !v);
            el.ws.classList.toggle('on', !!v);
        });
        set('gel', Math.round(p.gel), (v) => (el.wgb.style.transform = `scaleX(${v / 100})`));
        set('dry', p.dry, (v) => el.wg.classList.toggle('dry', !!v));
        set('heat', Math.round(Math.max(0, 1 - p.cool * 3.6) * 20), (v) => (el.wsb.style.transform = `scaleX(${1 - v / 20})`));
        const hp = Math.ceil(p.hp);
        set('hp', hp, (v) => {
            el.hpv.textContent = v;
            el.hpb.style.transform = `scaleX(${v / 100})`;
            el.hp.classList.toggle('low', v <= 30);
        });
        set('lit', D.lit, (v) => el.pips.forEach((e, i) => e.classList.toggle('on', i < v)));
        set('objt', D.boss ? (D.won ? 3 : 2) : D.lit === 3 ? 1 : 0, (v) => (el.obj.textContent = ['Reignite the three heat pylons', 'Hold out — something is waking', 'Destroy the Colossus', 'Station reignited'][v]));
        const b = D.boss;
        set('boss', !!b && !D.won, (v) => el.boss.classList.toggle('on', v));
        if (b) {
            set('bhp', Math.round((Math.max(0, b.hp) / b.max) * 200), (v) => (el.bossb.style.transform = `scaleX(${v / 200})`));
            set('barm', b.stun > 0 ? 0 : 1, (v) => el.boss.classList.toggle('arm', !!v));
            b.nodes.forEach((n, i) => set('n' + i, n.hp > 0, (v) => el.nodes[i].classList.toggle('x', !v)));
        }
        if (S.chain >= 3) {
            set('chain', S.chain, (v) => (el.chainb.textContent = '×' + v));
            if (S.chain !== lastChain) {
                el.chainb.style.transform = 'scale(1.25)';
                el.chainb.style.transition = 'none';
                requestAnimationFrame(() => {
                    el.chainb.style.transition = 'transform .25s';
                    el.chainb.style.transform = 'scale(1)';
                });
            }
        }
        lastChain = S.chain;
        set('chon', S.chain >= 3, (v) => el.chain.classList.toggle('on', v));
        // pylon markers
        const w = innerWidth,
            h = innerHeight;
        W.pylons.forEach((q, i) => {
            const m = el.mk[i];
            if (q.lit) {
                set('mk' + i, 'none', (v) => (m.style.display = v));
                return;
            }
            set('mk' + i, '', (v) => (m.style.display = v));
            const vis = project(q.x, q.y + 9.3, q.z, pj);
            let x = pj.x * w,
                y = pj.y * h;
            if (!vis) {
                x = w - x;
                y = h - 60;
            }
            x = Math.max(40, Math.min(w - 40, x));
            y = Math.max(70, Math.min(h - 120, y));
            m.style.transform = `translate(${(x / zoom) | 0}px,${(y / zoom) | 0}px)`;
            const d = Math.hypot(q.x - cam.x, q.z - cam.z);
            set('mkd' + i, d | 0, (v) => (m.lastChild.textContent = v + 'm'));
            set('mkh' + i, Math.round((1 - Math.max(0, q.hp) / W.PYHP) * 20), (v) => (m.children[1].firstChild.style.transform = `scaleX(${v / 20})`));
        });
    },
};
