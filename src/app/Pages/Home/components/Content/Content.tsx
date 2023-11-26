import { lazily } from 'react-lazily';
import type { ReactNode } from 'react';
import PROJECTS from '@assets/projects.json';
import cn from './Content.module.scss';

const { Zotbot } = lazily(() => import('@components/Three/components/Zotbot'));
const { DrivableZotbot } = lazily(
    () => import('@components/Three/components/Zotbot/DrivableZotbot')
);
const { UCI } = lazily(() => import('@components/Three/components/UCI'));
const { ThreeContainer } = lazily(
    () => import('@components/Three/ThreeContainer')
);

interface ContentProps {
    theme: number;
    project: any;
    y: number;
    children: ReactNode;
    projectsRef: any;
}

export const Content = ({
    theme,
    project,
    y,
    children,
    projectsRef,
    ...props
}: ContentProps) => (
    <div
        className={cn.content}
        style={{ height: (PROJECTS.length - 1) * 200 + 'vh' }}
        ref={projectsRef}
    >
        <div className={cn.container} {...props}>
            <ThreeContainer
                className={cn.container}
                theme={theme}
                project={project}
                y={y}
            >
                <Zotbot />
                <DrivableZotbot />
                <UCI />
            </ThreeContainer>
            {children}
        </div>
    </div>
);
