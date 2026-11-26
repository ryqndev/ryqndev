import { Banner, FpsCounter, HudLayer, Tip, useViewportZoom } from '@ryqndev/kiln-ui';
import { memo } from 'react';

import { HUD } from '../hooks/useHud';
import { Chart } from './components/Chart/Chart';
import { Helm } from './components/Helm/Helm';
import { Hold } from './components/Hold/Hold';
import { Hull } from './components/Hull/Hull';
import { PortMarker } from './components/PortMarker/PortMarker';
import { Reticle } from './components/Reticle/Reticle';
import { Targets } from './components/Targets/Targets';
import { Wanted } from './components/Wanted/Wanted';
import { HINTS } from './hints';

/** In-game heads-up display. Visible while sailing and, dimmed by the overlay, while paused. */
export const Hud = memo(function Hud() {
    const zoom = useViewportZoom();

    return (
        <HudLayer hud={HUD} zoom={zoom}>
            <Targets zoom={zoom} />
            <PortMarker zoom={zoom} />
            <Reticle />
            <Wanted />
            <Chart />
            <Hull />
            <Hold />
            <Helm />
            <Banner />
            <Tip hints={HINTS} />
            <FpsCounter />
        </HudLayer>
    );
});
