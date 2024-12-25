import { memo, type ReactNode } from 'react';
import PROJECTS from '@assets/projects.json';
import cn from './Content.module.scss';
import { ProjectZotbot } from '@components/Three/components/ProjectZotbot/ProjectZotbot';
import { ThreeContainer } from '@components/Three/ThreeContainer';
import { Zotbot } from '@components/Three/components/Zotbot';
import { UCI } from '@components/Three/components/UCI';
import { DrivableZotbot } from '@components/Three/components/Zotbot/DrivableZotbot';

interface ContentProps {
    project: any;
    children: ReactNode;
    projectsRef: any;
}

export const Content = memo(function Content({
    project,
    children,
    projectsRef,
}: ContentProps) {
    return (
        <div
            className={cn.content}
            style={{ height: (PROJECTS.length - 1) * 200 + 'vh' }}
            ref={projectsRef}
        >
            <div className={cn.container}>
                <ThreeContainer className={cn.container} project={project}>
                    {PROJECTS.map((data, index) => (
                        <ProjectZotbot
                            key={data.name}
                            data={data}
                            selected={project === index}
                        />
                    ))}
                    <Zotbot />
                    <DrivableZotbot />
                    <UCI />
                </ThreeContainer>
                {children}
            </div>
        </div>
    );
});
