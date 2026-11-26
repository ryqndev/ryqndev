import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../hooks/useHud';
import { useViewportZoom } from '../hooks/useViewportZoom';
import { Banner } from './components/Banner/Banner';
import { Chart } from './components/Chart/Chart';
import { FpsCounter } from './components/FpsCounter/FpsCounter';
import { Helm } from './components/Helm/Helm';
import { Hold } from './components/Hold/Hold';
import { Hull } from './components/Hull/Hull';
import { PortMarker } from './components/PortMarker/PortMarker';
import { Reticle } from './components/Reticle/Reticle';
import { Targets } from './components/Targets/Targets';
import { Tip } from './components/Tip/Tip';
import { Wanted } from './components/Wanted/Wanted';
import cn from './Hud.module.scss';

/** In-game heads-up display. Visible while sailing and, dimmed by the overlay, while paused. */
export const Hud = memo(function Hud() {
    const visible = useHud((s) => s.mode === 'play' || s.mode === 'pause');
    const zoom = useViewportZoom();

    return (
        <div className={clsx(cn.hud, visible && cn.on)} style={{ zoom }}>
            <Targets zoom={zoom} />
            <PortMarker zoom={zoom} />
            <Reticle />
            <Wanted />
            <Chart />
            <Hull />
            <Hold />
            <Helm />
            <Banner />
            <Tip />
            <FpsCounter />
        </div>
    );
});
