import { Banner, FpsCounter, HudLayer, Tip, useViewportZoom } from '@ryqndev/kiln-ui';
import { memo } from 'react';

import { HUD } from '../hooks/useHud';
import { BossBar } from './components/BossBar/BossBar';
import { ChainCounter } from './components/ChainCounter/ChainCounter';
import { Objective } from './components/Objective/Objective';
import { PylonMarkers } from './components/PylonMarkers/PylonMarkers';
import { Reticle } from './components/Reticle/Reticle';
import { Vitals } from './components/Vitals/Vitals';
import { WeaponPanel } from './components/WeaponPanel/WeaponPanel';
import { HINTS } from './hints';

/** In-game heads-up display. Visible while playing and, dimmed by the overlay, while paused. */
export const Hud = memo(function Hud() {
    const zoom = useViewportZoom();

    return (
        <HudLayer hud={HUD} zoom={zoom}>
            <Reticle />
            <Objective />
            <Vitals />
            <WeaponPanel />
            <BossBar />
            <Banner />
            <ChainCounter />
            <Tip hints={HINTS} />
            <PylonMarkers zoom={zoom} />
            <FpsCounter />
        </HudLayer>
    );
});
