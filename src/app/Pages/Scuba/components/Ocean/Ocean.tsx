import { useLoader } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import { BackSide, BufferGeometry, Mesh, MeshBasicMaterial, TextureLoader } from 'three';

const arr: string[] = [];
for (var i = 1; i <= 28; i++) {
    arr.push((await import(`../assets/shaws-compressed/${i.toString()}.jpg`)).default);
}

export const Ocean = memo(({ percent }: { percent: number }) => {
    const materialRef = useRef<MeshBasicMaterial>(null);
    const meshRef = useRef<BufferGeometry>(null);
    const loader = useLoader(TextureLoader, arr);
    const idx = useMemo(() => ~~(percent * arr.length), [percent]);

    useEffect(() => {
        if (!materialRef?.current?.map) return;
        const imageRef = document.createElement('img');
        imageRef.src = arr[idx];
        materialRef.current.map.source.data = imageRef;
        materialRef.current.map.needsUpdate = true;
    }, [loader, idx]);

    return (
        <mesh rotation={[0, 0, 0]} ref={meshRef}>
            <sphereGeometry args={[400, 40, 40]} />
            <meshBasicMaterial ref={materialRef} side={BackSide} map={loader[0]} />
        </mesh>
    );
});



