import { lazily } from 'react-lazily';

import clsx from 'clsx';
import { Suspense, memo } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';

import cn from './ThreeContainer.module.scss';
import { KeyboardControls } from '@react-three/drei';
import { useCustomKeyMapping } from './controllers/useCustomKeyMapping';
import { Lights } from './components/Lights/Lights';
import { CameraControls } from './components/CameraControls/CameraControls';
import { UCI } from './components/UCI';
const { Physics } = lazily(() => import('@react-three/rapier'));

interface ThreeContainerProps {
    className: string;
    children?: ReactNode;
    project: any;
}

export const ThreeContainer = memo(function ThreeContainer({
    className,
    children,
    project,
}: ThreeContainerProps) {
    const map = useCustomKeyMapping();

    return (
        <Suspense fallback={<div></div>}>
            <KeyboardControls map={map}>
                <Canvas className={clsx(className)} id={cn.container}>
                    <CameraControls project={project} />
                    <UCI />
                    {/* <Physics gravity={[0, -20, 0]}>
                        <Lights theme={theme} />
                        {children}
                    </Physics> */}
                </Canvas>
            </KeyboardControls>
        </Suspense>
    );
});
