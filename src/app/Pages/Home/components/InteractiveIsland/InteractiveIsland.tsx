import { lazily } from 'react-lazily';

import { Suspense, memo } from 'react';
import { Canvas } from '@react-three/fiber';

import cn from './InteractiveIsland.module.scss';
import { KeyboardControls } from '@react-three/drei';
import { useCustomKeyMapping } from './controllers/useCustomKeyMapping';
import { Lights } from './components/Lights/Lights';
import { CameraControls } from './components/CameraControls/CameraControls';
import { UCI } from './components/UCI';
const { Physics } = lazily(() => import('@react-three/rapier'));

export const InteractiveIsland = memo(function InteractiveIsland({
    project,
}) {
    const map = useCustomKeyMapping();

    return (
        <Suspense fallback={<div></div>}>
            <KeyboardControls map={map}>
                <Canvas id={cn.container}>
                    <CameraControls project={project} />
                    <UCI />
                    <Lights />
                    {/* {PROJECTS.map((data, index) => (
                        <ProjectZotbot
                            key={data.name}
                            data={data}
                            selected={project === index}
                        />
                    ))}
                    <Zotbot />
                    <DrivableZotbot />
                    <UCI /> */}
                    {/* <Physics gravity={[0, -20, 0]}>
                        <Lights theme={theme} />
                        {children}
                    </Physics> */}
                </Canvas>
            </KeyboardControls>
        </Suspense>
    );
});
