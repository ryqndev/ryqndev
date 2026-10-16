import { Suspense, memo, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import PROJECTS from '@assets/projects.json'

import cn from './InteractiveIsland.module.scss';
import { KeyboardControls } from '@react-three/drei';
import { useCustomKeyMapping } from './controllers/useCustomKeyMapping';
import { Lights } from './components/Lights/Lights';
import { CameraControls } from './components/CameraControls/CameraControls';
import { UCI } from './components/UCI';
import { Physics } from '@react-three/rapier';
import { Zotbot } from './components/Zotbot';
import { DrivableZotbot } from './components/Zotbot/DrivableZotbot';
import { ProjectZotbot } from './components/ProjectZotbot/ProjectZotbot';
import { CANVAS_DPR } from './constants';

export const InteractiveIsland = memo(function InteractiveIsland({
    project,
}: { project: any }) {
    const map = useCustomKeyMapping();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // The canvas lives in a sticky section that starts 1.5 screens down, so it
    // is offscreen (behind the curtain) for the whole landing view. While it
    // is, only render on demand (so textures and shaders still get their first
    // frame during the splash) and pause the physics world instead of
    // simulating 60 steps a second that nobody can see.
    const [onScreen, setOnScreen] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new IntersectionObserver(([entry]) =>
            setOnScreen(entry.isIntersecting)
        );
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    return (
        <Suspense fallback={<div></div>}>
            <KeyboardControls map={map}>
                <Canvas
                    id={cn.container}
                    dpr={CANVAS_DPR}
                    ref={canvasRef}
                    frameloop={onScreen ? 'always' : 'demand'}
                >
                    <CameraControls project={project} />
                    <Lights />
                    <Physics gravity={[0, -20, 0]} paused={!onScreen}>
                        <UCI />
                        <Zotbot />

                        {PROJECTS.map((data, index) => (
                            <ProjectZotbot
                                key={data.name}
                                data={data}
                                selected={project === index}
                            />
                        ))}
                        <DrivableZotbot />
                    </Physics>
                </Canvas>
            </KeyboardControls>
        </Suspense>
    );
});
