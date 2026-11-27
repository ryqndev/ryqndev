import {
    beginGame,
    berthsOf,
    type Build,
    CLASS_COST,
    CLASSES,
    commission,
    ESCORT_COST,
    fitOut,
    fitted,
    type Fitting,
    fittingsOf,
    gunsASide,
    hireEscort,
    holdOf,
    type Kind,
    leaveDrydock,
    MAX_ESCORTS,
    previewBuild,
    type Slot,
    UP,
} from '@ryqndev/brinewake-game';
import { useViewportZoom } from '@ryqndev/kiln-ui';
import clsx from 'clsx';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useHud } from '../hooks/useHud';
import { Crew } from './components/Crew/Crew';
import { Ladder } from './components/Ladder/Ladder';
import { Part } from './components/Part/Part';
import { StatSheet } from './components/StatSheet/StatSheet';
import { Swatches } from './components/Swatches/Swatches';
import cn from './Shipyard.module.scss';
import { effectsOf, sameBuild, type Standing, useYard, type Yard, YardContext } from './yard';

/** Milliseconds an offer stays tried on after the pointer leaves it. */
const LINGER = 140;

/** What the yard says of each hull, indexed like CLASSES. */
const HULL_BLURBS = ['Small, quick, and cheap to lose.', 'Two masts and a proper weight of metal. Goes where a sloop goes, and stays to fight.', 'A floating battery with a hold like a cathedral. Turns like one too.'];

// everything of one kind, on offer for one slot
const Fittings = memo(function Fittings({ slot, kind }: { slot: Slot; kind: Kind }) {
    const { build, owned } = useYard();
    // What an offer would do to the number of guns she mounts: a build changes the ports she is drawn
    // with, and a battery's mount how many guns stand at them. Each is measured against the plain case.
    const hull = CLASSES[build.cls].hull,
        decks = build.levels[UP.GUNDECK],
        form = fitted(build, 'lines').form,
        gunsWith = (f: Fitting) => (kind === 'lines' ? gunsASide(hull, decks, f.form) : kind === 'guns' ? gunsASide(hull, decks, form, f.mount) : 0),
        mounted = kind === 'lines' ? gunsASide(hull, decks) : kind === 'guns' ? gunsASide(hull, decks, form) : 0;

    return (
        <>
            {fittingsOf(kind).map((f) => {
                const standing: Standing = build.fit[slot] === f.id ? 'fitted' : owned.includes(f.id) ? 'owned' : 'sale';
                return (
                    <Part
                        blurb={f.blurb}
                        build={{ ...build, fit: { ...build.fit, [slot]: f.id } }}
                        cost={f.cost}
                        effects={kind === 'finish' ? undefined : effectsOf(f, gunsWith(f) - mounted)}
                        key={f.id}
                        name={f.name}
                        standing={standing}
                        tag={f.role}
                        take={kind === 'lines' ? 'Rebuild' : undefined}
                        taken={kind === 'lines' ? 'Built' : undefined}
                        onTake={() => fitOut(slot, f.id)}
                    />
                );
            })}
        </>
    );
});

const HullTab = memo(function HullTab() {
    const { build, hulls } = useYard();

    return (
        <>
            <h3>Hull</h3>
            {CLASSES.map((c, i) => (
                <Part
                    blurb={(
                        <>
                            {HULL_BLURBS[i]}
                            <br />
                            {gunsASide(c.hull, build.levels[UP.GUNDECK], fitted(build, 'lines').form)} gun ports a side · hold of {holdOf({ ...build, cls: i })} · {berthsOf({ ...build, cls: i })} berths
                        </>
                      )}
                    build={{ ...build, cls: i }}
                    cost={CLASS_COST[i]}
                    key={c.name}
                    name={c.name}
                    standing={build.cls === i ? 'fitted' : hulls[i] ? 'owned' : 'sale'}
                    take="Sail her"
                    taken="Yours"
                    onTake={() => commission(i)}
                />
            ))}
            <h3>Build</h3>
            <Fittings kind="lines" slot="lines" />
            <h3>Decks</h3>
            <Ladder id={UP.GUNDECK} />
            <Ladder id={UP.QUARTERS} />
            <h3>Timbers</h3>
            <Fittings kind="timbers" slot="timbers" />
            <h3>Yard work</h3>
            <Ladder id={UP.HULL} />
            <Ladder id={UP.HOLD} />
        </>
    );
});

const SIDES = ['port', 'starboard'] as const;

const GunsTab = memo(function GunsTab() {
    const { build } = useYard();
    // the two batteries are fitted separately: this is the one being looked at
    const [side, setSide] = useState<(typeof SIDES)[number]>('port');
    const names = fittingsOf('guns');

    return (
        <>
            <h3>Battery</h3>
            <div className={cn.sides}>
                {SIDES.map((s) => (
                    <button className={clsx(s === side && cn.on)} key={s} onClick={() => setSide(s)}>
                        <span>{s}</span>
                        {names.find((f) => f.id === build.fit[s])?.name}
                    </button>
                ))}
            </div>
            <Fittings kind="guns" slot={side} />
            <h3>Gunnery</h3>
            <Ladder id={UP.CANNONS} />
            <Ladder id={UP.TACKLE} />
        </>
    );
});

const RigTab = memo(function RigTab() {
    return (
        <>
            <h3>Sail plan</h3>
            <Fittings kind="rig" slot="rig" />
            <h3>Yard work</h3>
            <Ladder id={UP.SAILS} />
            <Ladder id={UP.RUDDER} />
        </>
    );
});

const StyleTab = memo(function StyleTab() {
    const { build } = useYard();
    // a finish that brings its own colours wears them over the paint and cloth chosen below
    const finish = fitted(build, 'finish');
    const set = finish.paint ? finish.name : undefined;

    return (
        <>
            <h3>Finish · changes her looks, not how she sails</h3>
            <Fittings kind="finish" slot="finish" />
            <h3>Paint · wale and flag</h3>
            <Swatches setBy={set} slot="paint" />
            <h3>Sailcloth</h3>
            <Swatches setBy={set} slot="cloth" />
            <h3>Sigil · on every square sail</h3>
            <Swatches slot="sigil" />
            <p className={cn.aside}>Your consorts sail under the same colours.</p>
        </>
    );
});

const FleetTab = memo(function FleetTab() {
    const gold = useHud((s) => s.gold);
    const escorts = useHud((s) => s.escorts);

    return (
        <>
            <h3>
                Consorts · {escorts} of {MAX_ESCORTS}
            </h3>
            <div className={cn.hire}>
                <div>
                    <div className={cn.name}>Hire a consort</div>
                    <div className={cn.detail}>A sloop that sails in your wake and fights alongside. Lost for good if sunk.</div>
                </div>
                {escorts < MAX_ESCORTS ? (
                    <button className={cn.buy} disabled={gold < ESCORT_COST} onClick={hireEscort}>
                        {ESCORT_COST}
                    </button>
                ) : (
                    <span className={cn.full}>Full company</span>
                )}
            </div>
        </>
    );
});

const TABS: [string, () => ReactNode][] = [
    ['Hull', () => <HullTab />],
    ['Guns', () => <GunsTab />],
    ['Rigging', () => <RigTab />],
    ['Crew', () => <Crew />],
    ['Style', () => <StyleTab />],
    ['Fleet', () => <FleetTab />],
];

/**
 * The home port. Plunder is banked on arrival, and gold builds the ship: a hull and the decks built
 * into it, the guns in each battery, her rig, timbers and colours, and the company that works her.
 * Whatever is being looked at is shown on the ship herself and in her figures before a coin is spent.
 */
export const Shipyard = memo(function Shipyard() {
    const open = useHud((s) => s.mode === 'port');
    const gold = useHud((s) => s.gold);
    const cls = useHud((s) => s.cls);
    const levels = useHud((s) => s.levels);
    const fit = useHud((s) => s.fit);
    const owned = useHud((s) => s.owned);
    const hulls = useHud((s) => s.hulls);
    const crew = useHud((s) => s.crew);
    const tavern = useHud((s) => s.tavern);
    // the yard as a mode of its own: a purse that buys everything, on a career that is not kept
    const drydock = useHud((s) => s.drydock);
    const zoom = useViewportZoom();
    const [tab, setTab] = useState(0);
    // the offer being looked at, and the ship it would make
    const [trying, setTrying] = useState<{ who: string; build: Build } | null>(null);
    const candidate = trying?.build ?? null;

    const build = useMemo<Build>(() => ({ cls, levels, fit, crew }), [cls, levels, fit, crew]);
    const leaving = useRef(0);
    const tryOn = useCallback((who: string, b: Build | null) => {
        window.clearTimeout(leaving.current);
        if (b) setTrying((cur) => (cur?.who === who && sameBuild(cur.build, b) ? cur : { who, build: b }));
        // taken off a moment late, so crossing the gap between two offers goes straight from one
        // to the other instead of flicking back to the real ship in between
        else leaving.current = window.setTimeout(() => setTrying((cur) => (cur?.who === who ? null : cur)), LINGER);
    }, []);
    useEffect(() => () => window.clearTimeout(leaving.current), []);
    const yard = useMemo<Yard>(() => ({ build, gold, owned, hulls, tavern, tryOn }), [build, gold, owned, hulls, tavern, tryOn]);

    // nothing is tried on once the yard is left
    if (!open && trying) setTrying(null);
    // the ship herself wears whatever is being looked at
    useEffect(() => previewBuild(candidate), [candidate]);

    return (
        <YardContext.Provider value={yard}>
            <div className={clsx(cn.shipyard, open && cn.open)} style={{ zoom }}>
                <StatSheet build={build} candidate={candidate} />
                <div className={cn.hint}>Drag to turn her round · scroll to zoom · double-click to reset</div>

                <div className={cn.panel}>
                    <header>
                        <h2>{drydock ? 'Drydock' : 'Shipyard'}</h2>
                        <div className={cn.purse}>
                            <span>{drydock ? 'Yard credit' : 'Banked'}</span>
                            <b>{gold}</b>
                        </div>
                    </header>

                    <nav className={cn.tabs}>
                        {TABS.map(([name], i) => (
                            <button className={clsx(i === tab && cn.on)} key={name} onClick={() => setTab(i)}>
                                {name}
                            </button>
                        ))}
                    </nav>

                    <div className={cn.body} key={tab}>
                        {TABS[tab][1]()}
                    </div>

                    <footer>
                        <button className={cn.sail} onClick={beginGame}>
                            {drydock ? 'Sea trials' : 'Put to sea'}
                        </button>
                        {drydock ? (
                            <button className={cn.leave} onClick={leaveDrydock}>
                                Leave the drydock · your own ship and save are untouched
                            </button>
                        ) : (
                            <div className={cn.note}>Hull mended and hold banked on arrival · what you buy is yours to swap freely</div>
                        )}
                    </footer>
                </div>
            </div>
        </YardContext.Provider>
    );
});
