import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './FpsCounter.module.scss';

/** Frame rate and internal resolution, toggled with P. */
export const FpsCounter = memo(function FpsCounter() {
    const fps = useHud((s) => s.fps);

    return <div className={cn.fps}>{fps}</div>;
});
