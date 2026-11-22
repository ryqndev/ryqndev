import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../hooks/useHud';
import { useViewportZoom } from '../hooks/useViewportZoom';
import { Banner } from './components/Banner/Banner';
import { BossBar } from './components/BossBar/BossBar';
import { ChainCounter } from './components/ChainCounter/ChainCounter';
import { FpsCounter } from './components/FpsCounter/FpsCounter';
import { Objective } from './components/Objective/Objective';
import { PylonMarkers } from './components/PylonMarkers/PylonMarkers';
import { Reticle } from './components/Reticle/Reticle';
import { Tip } from './components/Tip/Tip';
import { Vitals } from './components/Vitals/Vitals';
import { WeaponPanel } from './components/WeaponPanel/WeaponPanel';
import cn from './Hud.module.scss';

/** In-game heads-up display. Visible while playing and, dimmed by the overlay, while paused. */
export const Hud = memo(function Hud() {
    const visible = useHud((s) => s.mode === 'play' || s.mode === 'pause');
    const zoom = useViewportZoom();

    return (
        <div className={clsx(cn.hud, visible && cn.on)} style={{ zoom }}>
            <Reticle />
            <Objective />
            <Vitals />
            <WeaponPanel />
            <BossBar />
            <Banner />
            <ChainCounter />
            <Tip />
            <PylonMarkers zoom={zoom} />
            <FpsCounter />
        </div>
    );
});
