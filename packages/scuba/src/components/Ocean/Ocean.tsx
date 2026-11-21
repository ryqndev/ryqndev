import { useLoader } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import { BackSide, BufferGeometry, MeshBasicMaterial, TextureLoader } from 'three';

export const Ocean = memo(({ percent, images }: { percent: number, images: any[] }) => {
    const materialRef = useRef<MeshBasicMaterial>(null);
    const meshRef = useRef<BufferGeometry>(null);
    const loader = useLoader(TextureLoader, images);
    const idx = useMemo(() => ~~(percent * images.length), [percent]);

    useEffect(() => {
        if (!materialRef?.current?.map) return;
        const imageRef = document.createElement('img');
        imageRef.src = images[idx];
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



