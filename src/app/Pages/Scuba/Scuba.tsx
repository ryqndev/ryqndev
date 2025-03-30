import { ScrollableNotice } from "@components/ScrollableNotice/ScrollableNotice";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useScroll } from "app/controller/hooks/useScroll";
import { memo, useMemo, useRef } from "react";

import { Ocean } from "./components/Ocean/Ocean";
import { useImages } from "./controllers/useImages";
import cn from './Scuba.module.scss';

const getScrollableHeight = (el: HTMLElement) => {
    return el.scrollHeight - window.innerHeight;
}

export const Scuba = memo(function Home() {
    const y = useScroll();
    const container = useRef<HTMLDivElement>(null);
    const images = useImages();

    const percent = useMemo(() => container.current && getScrollableHeight(container.current)
        ? (y / getScrollableHeight(container.current))
        : 0, [y]);

    return (
        <main className={cn.container} ref={container}>
            <div className={cn.canvas}>
                <Canvas camera={{
                    zoom: 0.6,
                    position: [300, 0, 0]

                }} id={cn.canvas}>
                    <OrbitControls
                        enablePan={false}
                        enableRotate={true}
                        enableZoom={false}
                        target={[0, 0, 0]}
                    />
                    <Ocean images={images} percent={percent} />
                </Canvas>
            </div>
            <ScrollableNotice />
        </main>
    );
});
