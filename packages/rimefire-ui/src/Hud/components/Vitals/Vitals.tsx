import { Gauge } from '@ryqndev/kiln-ui';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Vitals.module.scss';

const LOW_HEALTH = 30;

export const Vitals = memo(function Vitals() {
    const hp = useHud((s) => s.hp);

    return <Gauge className={cn.vitals} fraction={hp / 100} label="Vitals" low={hp <= LOW_HEALTH} value={hp} />;
});
