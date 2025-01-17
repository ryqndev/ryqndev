import { useKeyboardControls } from '@react-three/drei';

import {
    useRevoluteJoint,
    type RapierRigidBody,
    type Vector3Tuple,
} from '@react-three/rapier';
import { useEffect } from 'react';
import type { RefObject } from 'react';
import { CustomControls } from '../../controllers/useCustomKeyMapping';

export const WheelJoint = ({
    body,
    wheel,
    bodyAnchor,
    wheelAnchor,
    rotationAxis,
}: {
    body: RefObject<RapierRigidBody | null>;
    wheel: RefObject<RapierRigidBody | null>;
    bodyAnchor: Vector3Tuple;
    wheelAnchor: Vector3Tuple;
    rotationAxis: Vector3Tuple;
}) => {
    const [sub] = useKeyboardControls<CustomControls>();

    // @ts-ignore
    const joint = useRevoluteJoint(body, wheel, [
        bodyAnchor,
        wheelAnchor,
        rotationAxis,
    ]);

    useEffect(() => {
        return sub(
            (state) => state,
            (pressed) => {
                if (!joint.current) return;
                joint.current.configureMotorVelocity(
                    pressed.FORWARD ? 30 : pressed.BACKWARD ? -30 : 0,
                    1000
                );
            }
        );
    }, []);

    return null;
};
