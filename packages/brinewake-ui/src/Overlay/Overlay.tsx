import { beginGame, type HudMode, resetProgress } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, type MouseEvent, useState } from 'react';

import { useHud } from '../hooks/useHud';
import { useViewportZoom } from '../hooks/useViewportZoom';
import { Controls } from './components/Controls/Controls';
import { RunStats } from './components/RunStats/RunStats';
import cn from './Overlay.module.scss';

type Screen = Exclude<HudMode, 'play' | 'port'>;

/** Full-screen menus: title, pause, lost ship and victory. Clicking it starts or resumes play. */
export const Overlay = memo(function Overlay() {
    const mode = useHud((s) => s.mode);
    const veteran = useHud((s) => s.gold > 0 || s.stats.sunk > 0 || s.cls > 0);
    const zoom = useViewportZoom();
    // keep showing the last screen while the overlay fades out into play
    const [screen, setScreen] = useState<Screen>('title');
    // starting over takes two clicks, so a stray one cannot sink a career
    const [sure, setSure] = useState(false);
    const off = mode === 'play' || mode === 'port';
    if (!off && mode !== screen) setScreen(mode);
    if (off && sure) setSure(false);

    const startOver = (e: MouseEvent) => {
        e.stopPropagation();
        if (sure) resetProgress();
        setSure(!sure);
    };

    return (
        <div className={clsx(cn.overlay, off && cn.off)} style={{ zoom }} onClick={beginGame}>
            {screen === 'title' && (
                <>
                    <h1>BRINEWAKE</h1>
                    <p>Take what floats. Bank what you can carry.</p>
                    <Controls />
                    <div className={cn.prompt}>{veteran ? 'CLICK TO PUT BACK TO SEA' : 'CLICK TO WEIGH ANCHOR'}</div>
                    <div className={cn.footnote}>Everything here is generated in code · desktop · mouse + keyboard</div>
                </>
            )}
            {screen === 'pause' && (
                <>
                    <h2>HOVE TO</h2>
                    <Controls />
                    <div className={cn.prompt}>CLICK TO RESUME</div>
                </>
            )}
            {screen === 'dead' && (
                <>
                    <h2>LOST WITH ALL HANDS</h2>
                    <p>The hold went down with her</p>
                    <RunStats />
                    <div className={cn.prompt}>CLICK TO FIT OUT AND SAIL AGAIN</div>
                </>
            )}
            {screen === 'win' && (
                <>
                    <h2>THE ADMIRAL IS SUNK</h2>
                    <p>These waters are yours</p>
                    <RunStats />
                    <div className={cn.prompt}>CLICK TO KEEP SAILING</div>
                </>
            )}
            {screen === 'unsupported' && (
                <p className={cn.unsupported}>
                    BRINEWAKE NEEDS WEBGL 2
                    <br />
                    enable hardware acceleration or try another browser
                </p>
            )}
            {veteran && (screen === 'title' || screen === 'pause') && (
                <button className={clsx(cn.reset, sure && cn.sure)} onClick={startOver}>
                    {sure ? 'Click again to scuttle your save' : 'Start over'}
                </button>
            )}
        </div>
    );
});
