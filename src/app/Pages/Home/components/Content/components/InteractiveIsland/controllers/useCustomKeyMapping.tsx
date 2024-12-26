import type { KeyboardControlsEntry } from '@react-three/drei';
import { useMemo } from 'react';

export enum CustomControls {
    FORWARD = 'FORWARD',
    BACKWARD = 'BACKWARD',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    JUMP = 'JUMP',
    SPAWN = 'SPAWN',
}

export const useCustomKeyMapping = () => {
    const map = useMemo<KeyboardControlsEntry<CustomControls>[]>(
        () => [
            { name: CustomControls.FORWARD, keys: ['KeyW'] },
            { name: CustomControls.BACKWARD, keys: ['KeyS'] },
            { name: CustomControls.LEFT, keys: ['KeyA'] },
            { name: CustomControls.RIGHT, keys: ['KeyD'] },
            { name: CustomControls.JUMP, keys: ['Space'] },
            { name: CustomControls.SPAWN, keys: ['KeyJ'] },
        ],
        []
    );

    return map;
};
