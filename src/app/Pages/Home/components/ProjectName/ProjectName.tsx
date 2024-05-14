import { memo } from 'react';
import cn from './ProjectName.module.scss';

export const ProjectName = memo(function ProjectName({
    name,
    y,
}: {
    name: string;
    y: number;
}) {
    return (
        <aside className={cn.container}>
            <p>
                • •<span>{name}</span>
            </p>
            <div className={cn.progress}>
                <svg className={cn.bar} fill="none">
                    <rect
                        className={cn.empty}
                        width="100%"
                        height={4}
                        rx={2}
                        fill="var(--accent-primary)"
                    />
                    <rect
                        className={cn.filled}
                        width={
                            (((y + window.innerHeight * 1.45) %
                                window.innerHeight) /
                                window.innerHeight) *
                                100 +
                            '%'
                        }
                        height="4"
                        rx="2"
                        fill="var(--accent-secondary)"
                    />
                </svg>
            </div>
        </aside>
    );
});
