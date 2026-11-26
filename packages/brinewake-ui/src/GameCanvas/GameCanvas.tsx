import { mountGame } from '@ryqndev/brinewake-game';
import { GameCanvas as Canvas } from '@ryqndev/kiln-ui';
import { memo } from 'react';

interface GameCanvasProps {
    /** expose the scripting handle and skip pointer lock (automated playtests) */
    debug?: boolean;
    /** open straight into the drydock instead of the title screen */
    drydock?: boolean;
}

const mountInDrydock: typeof mountGame = (canvas, options) => mountGame(canvas, { ...options, drydock: true });

/** The WebGL surface, running Brinewake's engine. */
export const GameCanvas = memo(function GameCanvas({ debug = false, drydock = false }: GameCanvasProps) {
    return <Canvas debug={debug} mount={drydock ? mountInDrydock : mountGame} />;
});
