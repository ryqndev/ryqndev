import { buyUpgrade, CLASSES, levelOf, maxLevel, upgradeCost, UPGRADES } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, useMemo } from 'react';

import { useTryOn, useYard } from '../../yard';
import cn from './Ladder.module.scss';

interface LadderProps {
    /** which improvement: an index into UPGRADES */
    id: number;
}

/** An improvement bought a level at a time: how far it has been taken, what the next level adds, and its price. */
export const Ladder = memo(function Ladder({ id }: LadderProps) {
    const { build, gold } = useYard();
    // what this hull carries of it: a bigger hull may take it further, and keeps whatever was paid for
    const level = levelOf(build, id);
    const max = maxLevel(id, build.cls);
    const done = level >= max;
    const cost = upgradeCost(id, build.levels[id]);
    // the ship with one more level of it: there is nothing to show once it is complete
    const next = useMemo(() => (done ? null : { ...build, levels: build.levels.map((l, i) => (i === id ? l + 1 : l)) }), [build, id, done]);
    const { look, away } = useTryOn(next);

    return (
        <div className={cn.ladder} onMouseLeave={away} onMouseOver={look}>
            <div>
                <div className={cn.name}>{UPGRADES[id].name}</div>
                <div className={cn.detail}>
                    <span className={cn.pips}>
                        {Array.from({ length: max }, (_, i) => (
                            <i className={clsx(i < level && cn.on)} key={i} />
                        ))}
                    </span>
                    {UPGRADES[id].effect}
                </div>
            </div>
            {done ? (
                <span className={cn.done}>{max < maxLevel(id) ? CLASSES[build.cls].name + ' limit' : 'Complete'}</span>
            ) : (
                <button className={cn.buy} disabled={gold < cost} onBlur={away} onClick={() => buyUpgrade(id)} onFocus={look}>
                    {cost}
                </button>
            )}
        </div>
    );
});
