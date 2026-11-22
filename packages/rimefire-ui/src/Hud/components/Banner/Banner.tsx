import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Banner.module.scss';

/** Large centred announcement (pylon lit, boss phases). */
export const Banner = memo(function Banner() {
    const banner = useHud((s) => s.banner);
    const on = useHud((s) => s.bannerOn);

    return (
        <div className={clsx(cn.banner, on && cn.on)}>
            <div className={cn.title}>{banner.title}</div>
            <div className={cn.sub}>{banner.sub}</div>
        </div>
    );
});
