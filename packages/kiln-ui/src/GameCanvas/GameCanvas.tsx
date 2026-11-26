import { memo, useEffect, useRef } from 'react';

import cn from './GameCanvas.module.scss';

interface GameCanvasProps {
    /** Starts the engine on the canvas and returns the function that stops it. */
    mount(canvas: HTMLCanvasElement, options: { debug: boolean }): () => void;
    /** expose the scripting handle and skip pointer lock (automated playtests) */
    debug?: boolean;
}

/** The WebGL surface. Owns the engine's lifetime: mounts it on the canvas and tears it down on unmount. */
export const GameCanvas = memo(function GameCanvas({ mount, debug = false }: GameCanvasProps) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => mount(canvas.current!, { debug }), [mount, debug]);

    return <canvas className={cn.canvas} ref={canvas} />;
});
