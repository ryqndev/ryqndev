import { useLayoutEffect, memo } from 'react';
import ChineseName from '@assets/chinese.svg?react';
import cn from './Curtain.module.scss';

export function Curtain({ y }: { y: number }) {
    useLayoutEffect(() => {
        const behind = document.getElementById(cn.behind);
        const front = document.getElementById(cn.front);
        const border = document.getElementById(cn.border);
        if (!behind || !front || !border) return;

        behind.style.transform = `scale(${y / 300 + 1})`;
        border.style.transform = `scale(${y / 300 + 1})`;
        front.style.transform = `rotate(${y / -20}deg)`;
        front.style.opacity = `${1 - y / 300}`;
    }, [y]);

    return (
        <header
            id={cn.container}
            data-mouse-hover="button"
            data-mouse-hover-text="Scroll down"
        >
            <h1 className={cn.name} id={cn.behind}>
                <ChineseName />
            </h1>
            <div id={cn.border}>
                <div
                    id={cn.content}
                    data-mouse-hover="button"
                    data-mouse-hover-text="Scroll down"
                >
                    <h1 className={cn.name} id={cn.front}>
                        <ChineseName />
                    </h1>
                </div>
            </div>
        </header>
    );
}
