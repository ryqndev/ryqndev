import { useLoader } from '@react-three/fiber';
import { memo, useEffect, useState } from 'react';
import { BackSide, Texture, TextureLoader } from 'three';

export const Ocean = memo(
    ({ percent, images }: { percent: number; images: string[] }) => {
        const frames = useLoader(TextureLoader, images);
        const idx = Math.min(
            images.length - 1,
            Math.max(0, ~~(percent * images.length))
        );

        // A single GPU texture is reused for the whole slideshow. Each step
        // points it at the already-loaded frame and re-uploads once (~32 MB at
        // 4096x2048) instead of keeping all frames resident (~900 MB) or, as
        // before, creating a brand-new <img> per step and re-decoding it.
        const [screen] = useState(() => {
            const texture = new Texture(frames[0].image);
            texture.colorSpace = frames[0].colorSpace;
            texture.needsUpdate = true;
            return texture;
        });

        useEffect(() => {
            const next = frames[idx];
            if (!next || screen.image === next.image) return;
            screen.image = next.image;
            screen.needsUpdate = true;
        }, [frames, idx, screen]);

        useEffect(() => () => screen.dispose(), [screen]);

        return (
            <mesh>
                <sphereGeometry args={[400, 40, 40]} />
                <meshBasicMaterial side={BackSide} map={screen} />
            </mesh>
        );
    }
);
