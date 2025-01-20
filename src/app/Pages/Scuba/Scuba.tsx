import { useScroll } from "app/controller/hooks/useScroll";
import { memo, use, useMemo, useRef } from "react";

import cn from './Scuba.module.scss';
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Ocean } from "./components/Ocean/Ocean";
import { ScrollableNotice } from "@components/ScrollableNotice/ScrollableNotice";

const getScrollableHeight = (el: HTMLElement) => {
    return el.scrollHeight - window.innerHeight;
}

export const Scuba = memo(function Home() {
    const imageLinks = useMemo(async () => {
        const arr: string[] = [];
        for (var i = 1; i <= 28; i++) {
            arr.push((await import(`./components/assets/shaws-compressed/${i.toString()}.jpg`)).default);
        }
        return arr;
    }, []);
    const images = use(imageLinks);
    const y = useScroll();
    const container = useRef<HTMLDivElement>(null);

    const percent = useMemo(() => container.current && getScrollableHeight(container.current)
        ? (y / getScrollableHeight(container.current))
        : 0, [y]);

    return (
        <main className={cn.container} ref={container}>
            <div className={cn.canvas}>
                <Canvas id={cn.canvas} camera={{
                    zoom: 0.6,
                    position: [300, 0, 0]

                }}>
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        enableRotate={true}
                        target={[0, 0, 0]}
                    />
                    <Ocean percent={percent} images={images} />
                </Canvas>
            </div>
            <ScrollableNotice />
        </main>
    );
});
