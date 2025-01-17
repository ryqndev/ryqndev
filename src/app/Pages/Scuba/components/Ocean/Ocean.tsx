import { useLoader } from '@react-three/fiber';
import { memo, useEffect, useRef, useState } from 'react';
import { BackSide, Mesh, TextureLoader } from 'three';
import OCEAN from '../assets/shaws-compressed/screenshot.jpg';

const arr: string[] = [];
for (var i = 1; i <= 28; i++) {
    arr.push((await import(`../assets/shaws/${i.toString()}.jpg`)).default);
}

export const Ocean = memo(() => {
    // console.log(OCEAN, '2sdf', arr)
    const [timer, setTimer] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(p => (p + 1) % 28);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const loader = useLoader(TextureLoader, arr[timer]);
    const galaxyRef = useRef<Mesh>(null);

    return (
        <mesh rotation={[0, 0, 0]} ref={galaxyRef}>
            <sphereGeometry args={[400, 40, 40]} />
            <meshBasicMaterial side={BackSide} map={loader} />
        </mesh>
    );
});

