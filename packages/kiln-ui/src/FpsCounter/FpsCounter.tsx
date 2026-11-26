import { memo } from 'react';

import { useHudCore } from '../hud/HudContext';
import cn from './FpsCounter.module.scss';

/** Frame rate and internal resolution. Empty until the game turns it on. */
export const FpsCounter = memo(function FpsCounter() {
    const fps = useHudCore((s) => s.fps);

    return <div className={cn.fps}>{fps}</div>;
});
