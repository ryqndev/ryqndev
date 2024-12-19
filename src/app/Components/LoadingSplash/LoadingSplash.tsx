import { useState, useEffect, memo } from 'react';
import type { ReactNode } from 'react';
import { useProgress } from '@react-three/drei';
import Plausible from 'plausible-tracker';
import clsx from 'clsx';
import cn from './LoadingSplash.module.scss';

export const LoadingSplash = memo(function LoadingSplash({
    className,
    children,
}: {
    className?: string;
    children?: ReactNode;
}) {
    const { progress } = useProgress();
    const [close, setClose] = useState(false);
    // const location = useLocation();
    const location = window.location;
    const { trackPageview } = Plausible();

    useEffect(trackPageview, [location, trackPageview]);

    useEffect(() => {
        if (progress < 100 && location.pathname === '/') return;

        setTimeout(() => setClose(true), 1000);
    }, [progress, location, close]);

    return (
        <>
            <div className={clsx(cn.container, close && cn.close)}></div>
            <div className={clsx(cn.container, close && cn.close)}></div>
            <div className={clsx(cn.container, close && cn.close)}></div>
            <div className={clsx(cn.container, close && cn.close)}>
                <div className={cn.content}>
                    <p>{Math.round(progress)}%</p>
                </div>
            </div>
            <div className={clsx(className)}>{children}</div>
        </>
    );
});
