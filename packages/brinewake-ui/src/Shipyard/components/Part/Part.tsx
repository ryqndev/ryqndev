import type { Build } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, type ReactNode } from 'react';

import { type Effect, type Standing, useTryOn, useYard } from '../../yard';
import cn from './Part.module.scss';

interface PartProps {
    name: string;
    /** a word beside the name saying what sort of thing it is */
    tag?: string;
    blurb: ReactNode;
    /** what it changes; left out for things that are what they are (a hull) */
    effects?: Effect[];
    standing: Standing;
    cost: number;
    /** the ship with this taken: shown while the card is being looked at */
    build: Build;
    /** what its button says once owned, and what it reads when it is the one in use */
    take?: string;
    taken?: string;
    onTake(): void;
    /** for the one in use, a way to give it up: the button's label and what it does */
    drop?: string;
    onDrop?(): void;
    /** why something owned cannot be taken just now, shown in place of its button */
    blocked?: string;
}

/** One thing the yard offers for a slot: what it is, what it does, and a button to buy it or fit it. */
export const Part = memo(function Part({ name, tag, blurb, effects, standing, cost, build, take = 'Fit', taken = 'Fitted', onTake, drop, onDrop, blocked }: PartProps) {
    const { gold } = useYard();
    const { look, away } = useTryOn(build);

    return (
        <div className={clsx(cn.part, standing === 'fitted' && cn.fitted)} onMouseLeave={away} onMouseOver={look}>
            <div className={cn.what}>
                <div className={cn.name}>
                    {name}
                    {tag && <span className={cn.tag}>{tag}</span>}
                </div>
                <div className={cn.blurb}>{blurb}</div>
                {effects && (
                    <div className={cn.effects}>
                        {effects.length === 0 && <span>Standard issue</span>}
                        {effects.map((e) => (
                            <span className={e.good ? cn.good : cn.bad} key={e.text}>
                                {e.text}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            {standing === 'fitted' ? (
                onDrop ? (
                    <button className={cn.take} onClick={onDrop}>
                        {drop}
                    </button>
                ) : (
                    <span className={cn.taken}>{taken}</span>
                )
            ) : standing === 'owned' && blocked ? (
                <span className={cn.blocked}>{blocked}</span>
            ) : standing === 'owned' ? (
                <button className={cn.take} onBlur={away} onClick={onTake} onFocus={look}>
                    {take}
                </button>
            ) : (
                <button className={cn.buy} disabled={gold < cost} onBlur={away} onClick={onTake} onFocus={look}>
                    {cost}
                </button>
            )}
        </div>
    );
});
