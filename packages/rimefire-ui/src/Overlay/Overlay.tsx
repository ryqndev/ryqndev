import { type Binding, clock, Controls, Overlay as OverlayLayer, OverlayFootnote, OverlayNotice, OverlayPrompt, RunStats } from '@ryqndev/kiln-ui';
import { beginGame, type HudMode } from '@ryqndev/rimefire-game';
import { memo, type ReactNode } from 'react';

import { HUD, useHud } from '../hooks/useHud';

const BINDINGS: Binding[] = [
    ['WASD', 'move'],
    ['MOUSE', 'aim'],
    ['LMB', 'fire'],
    ['Q / WHEEL / 1 2', 'swap gelcaster ⇄ striker'],
    ['SPACE', 'jump'],
    ['SHIFT', 'sprint'],
    ['G', 'graphics quality'],
    ['ESC', 'pause'],
];

/** End-of-run summary shown on the death and victory screens. */
const Summary = memo(function Summary() {
    const stats = useHud((s) => s.stats);

    return (
        <RunStats
            entries={[
                [clock(stats.time), 'Time'],
                [String(stats.det), 'Detonations'],
                ['×' + stats.best, 'Best chain'],
                [String(stats.kills), 'Shattered'],
            ]}
        />
    );
});

// play has no screen: the overlay fades out over the game
const SCREENS: Partial<Record<HudMode, ReactNode>> = {
    title: (
        <>
            <h1>RIMEFIRE</h1>
            <p>Coat it in gel. Then light it.</p>
            <Controls bindings={BINDINGS} />
            <OverlayPrompt>CLICK TO DEPLOY</OverlayPrompt>
            <OverlayFootnote>Everything here is generated in code · desktop · mouse + keyboard</OverlayFootnote>
        </>
    ),
    pause: (
        <>
            <h2>PAUSED</h2>
            <Controls bindings={BINDINGS} />
            <OverlayPrompt>CLICK TO RESUME</OverlayPrompt>
        </>
    ),
    dead: (
        <>
            <h2>FROZEN OUT</h2>
            <p>The station stays dark</p>
            <Summary />
            <OverlayPrompt>CLICK TO REDEPLOY</OverlayPrompt>
        </>
    ),
    win: (
        <>
            <h2>STATION REIGNITED</h2>
            <p>The Colossus is slag</p>
            <Summary />
            <OverlayPrompt>CLICK TO RUN IT AGAIN</OverlayPrompt>
        </>
    ),
    unsupported: (
        <OverlayNotice>
            RIMEFIRE NEEDS WEBGL 2
            <br />
            enable hardware acceleration or try another browser
        </OverlayNotice>
    ),
};

/** Full-screen menus: title, pause, death and victory. Clicking it starts or resumes play. */
export const Overlay = memo(function Overlay() {
    return <OverlayLayer hud={HUD} screens={SCREENS} onBegin={beginGame} />;
});
