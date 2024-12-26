import { Island } from './Island/Island';

export function UCI() {
    return (
        <Island
            receiveShadow
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={10}
        />
    );
}
