import { beginGame, buyShip, buyUpgrade, CLASS_COST, CLASSES, ESCORT_COST, hireEscort, MAX_ESCORTS, MAX_LEVEL, upgradeCost, UPGRADES } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, type ReactNode } from 'react';

import { useHud } from '../hooks/useHud';
import { useViewportZoom } from '../hooks/useViewportZoom';
import cn from './Shipyard.module.scss';

interface OfferProps {
    name: string;
    detail: ReactNode;
    /** price in gold, or null when there is nothing left to buy */
    cost: number | null;
    gold: number;
    onBuy(): void;
}

// one line of the shipyard's list: what it is, what it does, and a price to click
const Offer = memo(function Offer({ name, detail, cost, gold, onBuy }: OfferProps) {
    return (
        <div className={cn.offer}>
            <div>
                <div className={cn.name}>{name}</div>
                <div className={cn.detail}>{detail}</div>
            </div>
            {cost === null ? (
                <span className={cn.done}>Fitted</span>
            ) : (
                <button className={cn.buy} disabled={gold < cost} onClick={onBuy}>
                    {cost}
                </button>
            )}
        </div>
    );
});

const Pips = ({ level }: { level: number }) => (
    <span className={cn.pips}>
        {Array.from({ length: MAX_LEVEL }, (_, i) => (
            <i className={clsx(i < level && cn.on)} key={i} />
        ))}
    </span>
);

/** The home port: plunder is banked on arrival, and gold buys a better ship before putting back to sea. */
export const Shipyard = memo(function Shipyard() {
    const open = useHud((s) => s.mode === 'port');
    const gold = useHud((s) => s.gold);
    const cls = useHud((s) => s.cls);
    const levels = useHud((s) => s.levels);
    const escorts = useHud((s) => s.escorts);
    const zoom = useViewportZoom();
    const next = cls + 1 < CLASSES.length ? cls + 1 : null;

    return (
        <div className={clsx(cn.shipyard, open && cn.open)} style={{ zoom }}>
            <div className={cn.panel}>
                <header>
                    <h2>Shipyard</h2>
                    <div className={cn.purse}>
                        <span>Banked</span>
                        <b>{gold}</b>
                    </div>
                </header>

                <h3>Your {CLASSES[cls].name}</h3>
                {UPGRADES.map((u, i) => (
                    <Offer
                        cost={levels[i] < MAX_LEVEL ? upgradeCost(i, levels[i]) : null}
                        detail={(
                            <>
                                <Pips level={levels[i]} />
                                {u.effect}
                            </>
                          )}
                        gold={gold}
                        key={u.name}
                        name={u.name}
                        onBuy={() => buyUpgrade(i)}
                    />
                ))}

                <h3>The fleet</h3>
                <Offer
                    cost={next === null ? null : CLASS_COST[next]}
                    detail={next === null ? 'The biggest hull the yard can build' : 'A bigger hull, more guns a side, a deeper hold. Fittings carry over'}
                    gold={gold}
                    name={next === null ? CLASSES[cls].name : 'Trade up to a ' + CLASSES[next].name}
                    onBuy={buyShip}
                />
                <Offer
                    cost={escorts < MAX_ESCORTS ? ESCORT_COST : null}
                    detail="A sloop that sails in your wake and fights alongside. Lost for good if sunk"
                    gold={gold}
                    name={'Hire a consort · ' + escorts + ' / ' + MAX_ESCORTS}
                    onBuy={hireEscort}
                />

                <button className={cn.sail} onClick={beginGame}>
                    Put to sea
                </button>
                <div className={cn.note}>Hull mended and hold banked on arrival</div>
            </div>
        </div>
    );
});
