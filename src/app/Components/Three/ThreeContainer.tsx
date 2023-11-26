import clsx from 'clsx'
import { ReactNode, Suspense, memo, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { CameraControls } from './components'
import cn from './ThreeContainer.module.scss'
import { KeyboardControls, useKeyboardControls } from '@react-three/drei'
import { useCustomKeyMapping } from './controllers/useCustomKeyMapping'
import { Lights } from './components/Lights/Lights'

interface ThreeContainerProps {
    className: string
    children: ReactNode
    theme: number
    project: any
    y: number
}

export const ThreeContainer = ({
    className,
    children,
    theme,
    project,
}: ThreeContainerProps) => {
    const map = useCustomKeyMapping()

    return (
        <Suspense fallback={<div></div>}>
            <KeyboardControls map={map}>
                <Canvas className={clsx(className)} id={cn.container} shadows>
                    <CameraControls project={project} />
                    <Physics>
                        <Lights theme={theme} />
                        {children}
                    </Physics>
                </Canvas>
            </KeyboardControls>
        </Suspense>
    )
}
