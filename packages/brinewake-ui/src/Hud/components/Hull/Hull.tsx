import { Gauge } from '@ryqndev/kiln-ui';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Hull.module.scss';

/** Fraction of the hull left below which the gauge turns red. */
const HOLED = 0.3;

/** How much of the ship is left. Repaired for free whenever she docks. */
export const Hull = memo(function Hull() {
    const hp = useHud((s) => s.hp);
    const max = useHud((s) => s.maxHp);

    return <Gauge className={cn.hull} fraction={hp / max} label="Hull" low={hp <= max * HOLED} suffix={`/ ${max}`} value={hp} />;
});
