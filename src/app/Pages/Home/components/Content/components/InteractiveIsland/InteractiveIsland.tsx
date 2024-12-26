import { Suspense, memo } from 'react';
import { Canvas } from '@react-three/fiber';

import cn from './InteractiveIsland.module.scss';
import { KeyboardControls } from '@react-three/drei';
import { useCustomKeyMapping } from './controllers/useCustomKeyMapping';
import { Lights } from './components/Lights/Lights';
import { CameraControls } from './components/CameraControls/CameraControls';
import { UCI } from './components/UCI';
import { Physics } from '@react-three/rapier';
import { Zotbot } from './components/Zotbot';
import { DrivableZotbot } from './components/Zotbot/DrivableZotbot';

export const InteractiveIsland = memo(function InteractiveIsland({
    project,
}: { project: any }) {
    const map = useCustomKeyMapping();

    return (
        <Suspense fallback={<div></div>}>
            <KeyboardControls map={map}>
                <Canvas id={cn.container}>
                    <CameraControls project={project} />
                    <Lights />
                    <Physics gravity={[0, -20, 0]}>
                        <UCI />
                        <Zotbot />

                        {/* {PROJECTS.map((data, index) => (
                            <ProjectZotbot
                                key={data.name}
                                data={data}
                                selected={project === index}
                            />
                        ))} */}
                        {/* <DrivableZotbot /> */}
                    </Physics>
                </Canvas>
            </KeyboardControls>
        </Suspense>
    );
});
