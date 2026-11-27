import { beginGame, type HudMode, leaveDrydock, openDrydock, resetProgress } from '@ryqndev/brinewake-game';
import { type Binding, clock, Controls, Overlay as OverlayLayer, OverlayFootnote, OverlayNotice, OverlayPrompt, RunStats } from '@ryqndev/kiln-ui';
import clsx from 'clsx';
import { memo, type MouseEvent, type ReactNode, useState } from 'react';

import { HUD, useHud } from '../hooks/useHud';
import { Lobby } from '../Lobby/Lobby';
import cn from './Overlay.module.scss';

const BINDINGS: Binding[] = [
    ['W A S D', 'walk · shift to run · space to jump'],
    ['E', 'take the wheel, or leave it · climb aboard'],
    ['W / S', 'at the wheel: set or take in sail'],
    ['A / D', 'helm to port, starboard'],
    ['MOUSE', 'look · lay the guns on that side'],
    ['LMB', 'fire the broadside'],
    ['RMB', 'spyglass'],
    ['F', 'drop anchor at port'],
    ['CREW', 'E by a gun mans it · LMB fires it'],
    ['G', 'graphics quality'],
    ['ESC', 'pause'],
];

/** The career so far, shown when a ship is lost and when the admiral is beaten. */
const Summary = memo(function Summary() {
    const stats = useHud((s) => s.stats);

    return (
        <RunStats
            entries={[
                [clock(stats.time), 'Under sail'],
                [String(stats.sunk), 'Ships sunk'],
                [String(stats.plunder), 'Gold banked'],
            ]}
        />
    );
});

/** Throws the save away. */
const StartOver = memo(function StartOver() {
    const away = useHud((s) => s.mode === 'play' || s.mode === 'port');
    // starting over takes two clicks, so a stray one cannot sink a career
    const [sure, setSure] = useState(false);
    if (away && sure) setSure(false);

    const startOver = (e: MouseEvent) => {
        e.stopPropagation();
        if (sure) resetProgress();
        setSure(!sure);
    };

    return (
        <button className={clsx(cn.reset, sure && cn.sure)} onClick={startOver}>
            {sure ? 'Click again to scuttle your save' : 'Start over'}
        </button>
    );
});

// a button on a menu screen must not also count as the click that starts play
const only = (act: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    act();
};

/** The way into the drydock, from the title screen. */
const DrydockDoor = () => (
    <button className={cn.drydock} onClick={only(openDrydock)}>
        Drydock · build and try any ship
    </button>
);

/** The way back out of it, from any menu shown during sea trials. */
const DrydockExit = () => (
    <button className={cn.reset} onClick={only(leaveDrydock)}>
        Leave the drydock
    </button>
);

/** Full-screen menus: title, pause, lost ship and victory. Clicking it starts or resumes play. */
export const Overlay = memo(function Overlay() {
    const veteran = useHud((s) => s.gold > 0 || s.stats.sunk > 0 || s.cls > 0);
    const drydock = useHud((s) => s.drydock);
    const crew = useHud((s) => s.net.role);
    // the drydock has no save to scuttle: its menus offer the way out instead. Nor is a career scuttled
    // from under a crew.
    const corner = drydock ? <DrydockExit /> : veteran && crew === 'off' && <StartOver />;

    // play and port have no screen: the overlay fades out over the game
    const screens: Partial<Record<HudMode, ReactNode>> = {
        title: (
            <>
                <h1>BRINEWAKE</h1>
                <p>Take what floats. Bank what you can carry.</p>
                <Controls bindings={BINDINGS} />
                <OverlayPrompt>{crew === 'client' ? 'CLICK TO GO ABOARD' : veteran ? 'CLICK TO PUT BACK TO SEA' : 'CLICK TO WEIGH ANCHOR'}</OverlayPrompt>
                <OverlayFootnote>Everything here is generated in code · desktop · mouse + keyboard</OverlayFootnote>
                {crew === 'off' && <DrydockDoor />}
                {corner}
                <Lobby />
            </>
        ),
        pause: (
            <>
                <h2>{crew === 'off' ? 'HOVE TO' : 'STOOD DOWN'}</h2>
                {crew !== 'off' && <p>The crew sails on without you</p>}
                <Controls bindings={BINDINGS} />
                <OverlayPrompt>CLICK TO RESUME</OverlayPrompt>
                {corner}
                <Lobby />
            </>
        ),
        dead: (
            <>
                <h2>LOST WITH ALL HANDS</h2>
                <p>The hold went down with her</p>
                <Summary />
                <OverlayPrompt>CLICK TO FIT OUT AND SAIL AGAIN</OverlayPrompt>
                {drydock && <DrydockExit />}
            </>
        ),
        win: (
            <>
                <h2>THE ADMIRAL IS SUNK</h2>
                <p>These waters are yours</p>
                <Summary />
                <OverlayPrompt>CLICK TO KEEP SAILING</OverlayPrompt>
            </>
        ),
        unsupported: (
            <OverlayNotice>
                BRINEWAKE NEEDS WEBGL 2
                <br />
                enable hardware acceleration or try another browser
            </OverlayNotice>
        ),
    };

    return <OverlayLayer hud={HUD} screens={screens} onBegin={beginGame} />;
});
