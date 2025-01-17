import { useScroll } from "app/controller/hooks/useScroll";
import { memo } from "react";

import cn from './Scuba.module.scss';
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Ocean } from "./components/Ocean/Ocean";

export const Scuba = memo(function Home() {
    const y = useScroll();

    return (
        <main className={cn.container}>
            <Canvas id={cn.container} camera={{
                zoom: 0.6,
                position: [300, 0, 0]

            }}>
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    enableRotate={true}
                    target={[0, 0, 0]}
                />
                <Ocean />
            </Canvas>
        </main>
    );
});
