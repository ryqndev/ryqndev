import {
    type Ref,
    createRef,
} from 'react';
import type { Euler, Vector3 } from '@react-three/fiber';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { v4 as uuidv4 } from 'uuid';
import { random } from 'app/utils/utils';

export interface ZotbotSpawnState {
    id: string;
    position: Vector3;
    rotation: Euler;
    ref: Ref<any>;
}

export const getRandomSpawnState = (): ZotbotSpawnState => ({
    id: uuidv4(),
    position: [random(-60, 60), random(100, 200), random(-60, 60)],
    rotation: [random(0, Math.PI), random(0, Math.PI), random(0, Math.PI)],
    ref: createRef(),
});

export const generateNZotbots = (n: number) =>
    new Array(n).fill(0).map(getRandomSpawnState);
