import { useFrame } from '@react-three/fiber';
import { useThemeStore } from 'app/controller/theme/theme.store';
import { memo, useRef } from 'react';
import { Color, DirectionalLight } from 'three';
import { useShallow } from 'zustand/shallow';

export const Lights = memo(function Lights() {
    const light = useRef<DirectionalLight>(null);
    const theme = useThemeStore(useShallow(store => store.theme));


    useFrame(() => {
        light.current?.color.lerp(
            theme ? new Color('#ffff00') : new Color('#6633dd'),
            0.05
        );
    });

    return (
        <>
            <directionalLight
                ref={light}
                castShadow
                intensity={2}
                position={[0, 50, 100]}
                color={theme ? '#6633dd' : '#ffff00'}
            />
            <directionalLight
                intensity={theme ? 1 : 1}
                position={[0, -100, 50]}
                color={theme ? '#ffff00' : '#a66B33'}
            />
            <ambientLight
                intensity={theme ? 0.8 : 0.4}
                color={theme ? 'white' : '#6633dd'}
            />
            <directionalLight intensity={0.4} color={'white'} />
            <directionalLight
                intensity={1}
                position={[0, -100, 100]}
                color={'white'}
            />
        </>
    );
});
