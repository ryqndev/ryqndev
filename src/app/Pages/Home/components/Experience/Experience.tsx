import { lazily } from 'react-lazily';
import type { ReactNode } from 'react';
// import PROJECTS from '@assets/projects.json';
import cn from './Experience.module.scss';

const { Zotbot } = lazily(() => import('@components/Three/components/Zotbot'));
const { DrivableZotbot } = lazily(
    () => import('@components/Three/components/Zotbot/DrivableZotbot')
);
const { UCI } = lazily(() => import('@components/Three/components/UCI'));
const { ThreeContainer } = lazily(
    () => import('@components/Three/ThreeContainer')
);

interface ExperienceProps {
    theme: number;
    project: any;
    y: number;
    children: ReactNode;
}

export const Experience = ({
    theme,
    project,
    y,
    children,
    ...props
}: ExperienceProps) => (
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
);
