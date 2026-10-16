import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { memo, useEffect, useRef, useState } from 'react';
import cn from './CustomMouseCursor.module.scss';
import useDebounce from 'app/controller/hooks/useDebounce';

export const CustomMouseCursor = memo(function CustomMouseCursor() {
    const { t } = useTranslation();
    const cursorRef = useRef<HTMLDivElement>(null);

    // Only what changes the cursor's appearance goes through React state.
    // Position is written straight to the element as a transform.
    const [hover, setHover] = useState({ target: 'none', message: '' });
    const debouncedHover = useDebounce(hover, 80);

    useEffect(() => {
        let frame = 0;
        let x = -100;
        let y = -100;

        const apply = () => {
            frame = 0;
            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            x = e.clientX;
            y = e.clientY;
            if (!frame) frame = requestAnimationFrame(apply);

            const dataset = (e.target as HTMLElement | null)?.dataset;
            const target = dataset?.mouseHover ?? 'none';
            const message = dataset?.mouseHoverText ?? '';
            setHover((prev) =>
                prev.target === target && prev.message === message
                    ? prev
                    : { target, message }
            );
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div
            ref={cursorRef}
            className={clsx(
                cn.container,
                debouncedHover.target === 'link' && cn.link,
                debouncedHover.target === 'button' && cn.button
            )}
        >
            <svg viewBox="0 0 300 300" enableBackground="new 0 0 300 300">
                <defs>
                    <path
                        id="circleTextPath"
                        d="M 150, 150 m -120, 0 a 120,120 0 0,1 240,0 a 120,120 0 0,1 -240,0"
                    />
                </defs>
                <g>
                    <use xlinkHref="#circleTextPath" fill="none" />
                    <text fill="#fff">
                        <textPath xlinkHref="#circleTextPath">
                            {t(debouncedHover.message)}
                        </textPath>
                    </text>
                </g>
            </svg>
        </div>
    );
});
