import { GameCanvas as Canvas } from '@ryqndev/kiln-ui';
import { mountGame } from '@ryqndev/rimefire-game';
import { memo } from 'react';

interface GameCanvasProps {
    /** expose the scripting handle and skip pointer lock (automated playtests) */
    debug?: boolean;
}

/** The WebGL surface, running Rimefire's engine. */
export const GameCanvas = memo(function GameCanvas({ debug = false }: GameCanvasProps) {
    return <Canvas debug={debug} mount={mountGame} />;
});
