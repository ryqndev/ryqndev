import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { memo, useRef, useState } from 'react'
import { BackSide, Mesh, TextureLoader, Vector3 } from 'three'
import GALAXY from './components/darker_eso.jpg'
import cn from './ThreeContainer.module.scss'
import { CameraControls } from './components'

const Container = ({ project }: { project: any }) => {
    return (
        <Canvas id={cn.stars}>
            <CameraControls project={project} />
            <Stars />
        </Canvas>
    )
}

const Stars = memo(() => {
    const loader = useLoader(TextureLoader, GALAXY)
    const galaxyRef = useRef<Mesh>(null)
    const [stars] = useState(() =>
        new Array(150)
            .fill(undefined)
            .map(
                (_) =>
                    new Vector3(
                        Math.random() * 800 - 400,
                        Math.random() * 800 - 400,
                        Math.random() * 800 - 400
                    )
            )
    )

    useFrame(() => {
        if (!galaxyRef.current) return
        galaxyRef.current.rotation.y += 0.0001
    })

    // Credit goes to "ESO/S. Brunier (http://www.sergebrunier.com/gallerie/pleinciel/index-eng.html)"
    return (
        <mesh rotation={[1.2, 0, 1]} ref={galaxyRef}>
            <sphereGeometry args={[400, 40, 40]} />
            <meshBasicMaterial side={BackSide} map={loader} />
            <>
                {stars.map((e, idx) => (
                    <mesh key={idx} position={e}>
                        <sphereGeometry args={[0.6, 5, 5]} />
                        <meshBasicMaterial color="var(--accent-secondary)" />
                    </mesh>
                ))}
            </>
        </mesh>
    )
})

export { Container as Stars }
