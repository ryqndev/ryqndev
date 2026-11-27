import { mountGame } from '@ryqndev/brinewake-game';
import { GameCanvas as Canvas } from '@ryqndev/kiln-ui';
import { memo } from 'react';

interface GameCanvasProps {
    /** expose the scripting handle and skip pointer lock (automated playtests) */
    debug?: boolean;
    /** open straight into the drydock instead of the title screen */
    drydock?: boolean;
    /** make crews up between tabs of this browser instead of over the internet (working on the game) */
    localCrews?: boolean;
}

// one mount function for each way the game can be started, each the same function from render to render
const MOUNTS = [false, true].map((drydock) => [false, true].map((localCrews): typeof mountGame => (canvas, options) => mountGame(canvas, { ...options, drydock, localCrews })));

/** The WebGL surface, running Brinewake's engine. */
export const GameCanvas = memo(function GameCanvas({ debug = false, drydock = false, localCrews = false }: GameCanvasProps) {
    return <Canvas debug={debug} mount={MOUNTS[+drydock][+localCrews]} />;
});
