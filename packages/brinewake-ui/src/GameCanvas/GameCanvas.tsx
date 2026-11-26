import { mountGame } from '@ryqndev/brinewake-game';
import { memo, useEffect, useRef } from 'react';

import cn from './GameCanvas.module.scss';

interface GameCanvasProps {
    /** expose the scripting handle and skip pointer lock (automated playtests) */
    debug?: boolean;
}

/** The WebGL surface. Owns the engine's lifetime: mounts it on the canvas and tears it down on unmount. */
export const GameCanvas = memo(function GameCanvas({ debug = false }: GameCanvasProps) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => mountGame(canvas.current!, { debug }), [debug]);

    return <canvas className={cn.canvas} ref={canvas} />;
});
