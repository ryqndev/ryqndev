import { beginGame, type HudMode } from '@ryqndev/rimefire-game';
import clsx from 'clsx';
import { memo, useState } from 'react';

import { useHud } from '../hooks/useHud';
import { useViewportZoom } from '../hooks/useViewportZoom';
import { Controls } from './components/Controls/Controls';
import { RunStats } from './components/RunStats/RunStats';
import cn from './Overlay.module.scss';

type Screen = Exclude<HudMode, 'play'>;

/** Full-screen menus: title, pause, death and victory. Clicking it starts or resumes play. */
export const Overlay = memo(function Overlay() {
    const mode = useHud((s) => s.mode);
    const zoom = useViewportZoom();
    // keep showing the last screen while the overlay fades out into play
    const [screen, setScreen] = useState<Screen>('title');
    if (mode !== 'play' && mode !== screen) setScreen(mode);

    return (
        <div className={clsx(cn.overlay, mode === 'play' && cn.off)} style={{ zoom }} onClick={beginGame}>
            {screen === 'title' && (
                <>
                    <h1>RIMEFIRE</h1>
                    <p>Coat it in gel. Then light it.</p>
                    <Controls />
                    <div className={cn.prompt}>CLICK TO DEPLOY</div>
                    <div className={cn.footnote}>Everything here is generated in code · desktop · mouse + keyboard</div>
                </>
            )}
            {screen === 'pause' && (
                <>
                    <h2>PAUSED</h2>
                    <Controls />
                    <div className={cn.prompt}>CLICK TO RESUME</div>
                </>
            )}
            {screen === 'dead' && (
                <>
                    <h2>FROZEN OUT</h2>
                    <p>The station stays dark</p>
                    <RunStats />
                    <div className={cn.prompt}>CLICK TO REDEPLOY</div>
                </>
            )}
            {screen === 'win' && (
                <>
                    <h2>STATION REIGNITED</h2>
                    <p>The Colossus is slag</p>
                    <RunStats />
                    <div className={cn.prompt}>CLICK TO RUN IT AGAIN</div>
                </>
            )}
            {screen === 'unsupported' && (
                <p className={cn.unsupported}>
                    RIMEFIRE NEEDS WEBGL 2
                    <br />
                    enable hardware acceleration or try another browser
                </p>
            )}
        </div>
    );
});
