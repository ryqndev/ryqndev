import { memo } from 'react';
import ChineseName from '@assets/chinese.svg?react';
import cn from './Curtain.module.scss';

export const Curtain = memo(function Curtain({ y }: { y: number }) {
    return (
        <header
            id={cn.container}
            data-mouse-hover="button"
            data-mouse-hover-text="Scroll down"
        >
            <h1
                className={cn.name}
                style={{
                    transform: `scale(${y / 300 + 1})`,
                    willChange: 'transform',
                }}
                id={cn.behind}
            >
                <ChineseName />
            </h1>
            <div
                id={cn.border}
                style={{
                    transform: `scale(${y / 300 + 1})`,
                    willChange: 'transform',
                }}
            >
                <div
                    id={cn.content}
                    data-mouse-hover="button"
                    data-mouse-hover-text="Scroll down"
                >
                    <h1
                        className={cn.name}
                        id={cn.front}
                        style={{
                            opacity: `${1 - y / 300}`,
                            transform: `rotate(${y / -20}deg)`,
                            willChange: 'transform',
                        }}
                    >
                        <ChineseName />
                    </h1>
                </div>
            </div>
        </header>
    );
});
