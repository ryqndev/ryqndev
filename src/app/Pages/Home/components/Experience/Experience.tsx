import { ReactNode, memo } from 'react';
// import PROJECTS from '@assets/projects.json';
import cn from './Experience.module.scss';
import { Zotbot } from '@components/Three/components/Zotbot';
import { DrivableZotbot } from '@components/Three/components/Zotbot/DrivableZotbot';
import { UCI } from '@components/Three/components/UCI';
import { ThreeContainer } from '@components/Three/ThreeContainer';

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
