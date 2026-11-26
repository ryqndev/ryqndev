import { aboard, berthsOf, hire, MAX_SKILL, post, postEffects, type Sailor, shipStats, SKILLS, type Station, type StationDef, STATIONS, withPost } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, useState } from 'react';

import { useYard } from '../../yard';
import { Part } from '../Part/Part';
import cn from './Crew.module.scss';

// a skill rating, as so many pips out of the most there can be
const Pips = ({ n }: { n: number }) => (
    <span className={cn.pips}>
        {Array.from({ length: MAX_SKILL }, (_, i) => (
            <i className={clsx(i < n && cn.on)} key={i} />
        ))}
    </span>
);

interface HandProps {
    sailor: Sailor;
    /** the station being filled */
    station: StationDef;
    /** still at the tavern: taking her means hiring her first */
    recruit?: boolean;
}

// one sailor, as a candidate for the station being filled: what she is good at, what she would do
// there, and a button to hire her, post her or stand her down
const Hand = memo(function Hand({ sailor, station, recruit = false }: HandProps) {
    const { build } = useYard();
    const here = sailor.post === station.id;
    // the company with her in the job: unchanged when there is no berth to bring her aboard
    const posted = here ? build.crew : withPost(build.crew, sailor, station.id, berthsOf(build));
    const noBerth = !here && posted === build.crew;
    const elsewhere = !here && sailor.post ? STATIONS.find((s) => s.id === sailor.post)!.name.toLowerCase() : null;

    const does = postEffects(station.id, sailor.skills[station.skill]).map((text) => ({ text, good: true }));
    if (!does.length) does.push({ text: 'No hand for this work', good: false });
    if (recruit && noBerth) does.push({ text: 'No berth free: she would wait ashore', good: false });

    return (
        <Part
            blocked={noBerth ? 'No berth' : undefined}
            blurb={(
                <>
                    <span className={cn.skills}>
                        {SKILLS.filter((k) => sailor.skills[k] > 0).map((k) => (
                            <span className={clsx(k === station.skill && cn.wanted)} key={k}>
                                {k} <Pips n={sailor.skills[k]} />
                            </span>
                        ))}
                    </span>
                    Takes {Math.round(sailor.share * 100)}% of what you bank while aboard
                    {elsewhere && ' · now ' + elsewhere}
                </>
              )}
            build={posted === build.crew ? build : { ...build, crew: posted }}
            cost={sailor.cost}
            drop="Stand down"
            effects={does}
            name={sailor.name}
            standing={here ? 'fitted' : recruit ? 'sale' : 'owned'}
            take="Post"
            onDrop={() => post(sailor.id, null)}
            onTake={() => (recruit ? hire(sailor.id, station.id) : post(sailor.id, station.id))}
        />
    );
});

/**
 * The ship's company. Pick a station, then who should hold it: someone already hired, or a
 * recruit from the tavern. A sailor is only as much use at a station as her skill at its work,
 * and everyone aboard takes a berth and a share.
 */
export const Crew = memo(function Crew() {
    const { build, tavern } = useYard();
    // the job being filled
    const [at, setAt] = useState<Station>('helm');
    const station = STATIONS.find((s) => s.id === at)!;
    const stats = shipStats(build);
    const company = aboard(build.crew, stats.berths);
    // whoever is best at the job comes first
    const best = (a: Sailor, b: Sailor) => b.skills[station.skill] - a.skills[station.skill];

    return (
        <>
            <h3>
                Stations · {company.length} of {stats.berths} berths taken
            </h3>
            <div className={cn.stations}>
                {STATIONS.map((s) => {
                    const who = company.find((c) => c.post === s.id);
                    return (
                        <button className={clsx(s.id === at && cn.on, !who && cn.vacant)} key={s.id} onClick={() => setAt(s.id)}>
                            <span>{s.name}</span>
                            {who ? who.name : 'Vacant'}
                            {who && <Pips n={who.skills[s.skill]} />}
                        </button>
                    );
                })}
            </div>
            <p className={cn.does}>
                {station.does} Calls for <b>{station.skill}</b>.
            </p>

            <h3>Your company</h3>
            {build.crew.length === 0 && <p className={cn.aside}>Nobody has signed on yet. Hire from the tavern below.</p>}
            {[...build.crew].sort(best).map((s) => (
                <Hand key={s.id} sailor={s} station={station} />
            ))}

            <h3>At the tavern</h3>
            {tavern.length === 0 && <p className={cn.aside}>Nobody left looking for a ship. There will be new faces next time you come in.</p>}
            {[...tavern].sort(best).map((s) => (
                <Hand key={s.id} recruit sailor={s} station={station} />
            ))}
            <p className={cn.aside}>
                New faces each time you come into port. The crew aboard take {Math.round(stats.share * 100)}% of what you bank; anyone ashore takes nothing. More berths come from a bigger hull or living quarters.
            </p>
        </>
    );
});
