import clsx from 'clsx';
import { memo } from 'react';

import { useHudCore } from '../hud/HudContext';
import cn from './Banner.module.scss';

/** Large centred announcement, raised by the game with hud.banner(). */
export const Banner = memo(function Banner() {
    const banner = useHudCore((s) => s.banner);
    const on = useHudCore((s) => s.bannerOn);

    return (
        <div className={clsx(cn.banner, on && cn.on)}>
            <div className={cn.title}>{banner.title}</div>
            <div className={cn.sub}>{banner.sub}</div>
        </div>
    );
});
