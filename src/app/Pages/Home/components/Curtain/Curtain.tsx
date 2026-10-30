import { memo, useEffect, useRef } from 'react';
import ChineseName from '@assets/chinese.svg?react';
import cn from './Curtain.module.scss';

export const Curtain = memo(function Curtain() {
    const behindRef = useRef<HTMLHeadingElement>(null);
    const borderRef = useRef<HTMLDivElement>(null);
    const frontRef = useRef<HTMLHeadingElement>(null);

    // The scroll-linked transforms are written straight to the DOM from a
    // rAF-throttled scroll listener. Routing them through React state meant
    // the curtain only moved every 200 ms (debounced) and then tweened to
    // catch up, and re-rendered the Home tree to do it.
    useEffect(() => {
        let frame = 0;

        const apply = () => {
            frame = 0;
            const y = Math.min(window.scrollY, window.innerHeight * 1.5);
            const scale = `scale(${y / 300 + 1})`;

            if (behindRef.current) behindRef.current.style.transform = scale;
            if (borderRef.current) borderRef.current.style.transform = scale;
            if (frontRef.current) {
                frontRef.current.style.opacity = `${1 - y / 300}`;
                frontRef.current.style.transform = `rotate(${y / -20}deg)`;
            }
        };

        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(apply);
        };

        apply();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <header
            id={cn.container}
            data-mouse-hover="button"
            data-mouse-hover-text="Scroll down"
        >
            <h1 className={cn.name} id={cn.behind} ref={behindRef}>
                <ChineseName />
            </h1>
            <div id={cn.border} ref={borderRef}>
                <div
                    id={cn.content}
                    data-mouse-hover="button"
                    data-mouse-hover-text="Scroll down"
                >
                    <h1 className={cn.name} id={cn.front} ref={frontRef}>
                        <ChineseName />
                    </h1>
                </div>
            </div>
        </header>
    );
});
