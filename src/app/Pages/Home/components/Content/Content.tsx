import { memo, type ReactNode } from 'react';
import PROJECTS from '@assets/projects.json';
import cn from './Content.module.scss';
import { ProjectZotbot } from '@components/Three/components/ProjectZotbot/ProjectZotbot';
import { Zotbot } from '@components/Three/components/Zotbot';
import { UCI } from '@components/Three/components/UCI';
import { DrivableZotbot } from '@components/Three/components/Zotbot/DrivableZotbot';
import { InteractiveIsland } from '../InteractiveIsland/InteractiveIsland';

interface ContentProps {
    project: any;
    children: ReactNode;
    projectsRef: any;
}

export const Content = memo(function Content({
    project,
    projectsRef,
}: ContentProps) {
    return (
        <div
            className={cn.content}
            style={{ height: (PROJECTS.length - 1) * 200 + 'vh' }}
            ref={projectsRef}
        >
            <div className={cn.container}>
                <InteractiveIsland project={project} />
                <div className={clsx(cn.controls)}>
                    <PageOverlay
                        visible={y > CURTAIN_BREAKPOINT}
                        pages={PROJECTS}
                        project={project}
                        setProject={setProject}
                    />
                    <LanguageSelect visible={y > CURTAIN_BREAKPOINT} />
                    {PROJECTS?.[project] && (
                        <>
                            <Timespan
                                {...PROJECTS[project].date}
                                visible={y > CURTAIN_BREAKPOINT}
                            />
                            <ProjectName
                                name={PROJECTS[project].displayName}
                                y={y}
                            />
                        </>
                    )}
                    <Socials visible={y > CURTAIN_BREAKPOINT} />
                </div>
            </div>
        </div>
    );
});
