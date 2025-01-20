import { useLoader } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import { BackSide, Mesh, TextureLoader } from 'three';

const arr: string[] = [];
for (var i = 1; i <= 28; i++) {
    arr.push((await import(`../assets/shaws-compressed/${i.toString()}.jpg`)).default);
}

export const Ocean = memo(({ percent }: { percent: number }) => {

    const idx = useMemo(() => ~~(percent * 28), [percent]);

    const loader = useLoader(TextureLoader, arr);
    const sceneryRef = useRef<Mesh>(null);

    return (
        <mesh rotation={[0, 0, 0]} ref={sceneryRef}>
            <sphereGeometry args={[400, 40, 40]} />
            <meshBasicMaterial side={BackSide} map={loader[idx]} />
        </mesh>
    );
});

