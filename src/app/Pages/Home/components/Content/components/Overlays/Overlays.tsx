import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { PageOverlay } from './components/PageOverlay/PageOverlay';
import { LanguageSelect } from './components/LanguageSelect/LanguageSelect';
import { Timespan } from './components/Timespan/Timespan';
import { ProjectName } from './components/ProjectName/ProjectName';
import { Socials } from './components/Socials/Socials';
import PROJECTS from '@assets/projects.json';

import cn from './Overlays.module.scss';
import { useProjects } from '@pages/Home/controller/useProjects';
import { useScroll } from 'app/controller/hooks/useScroll';

export const Overlays = memo(function Overlays({
    project,
    projectsRef,
}: {
    project: any;
    projectsRef: any;
}) {
    const y = useScroll();
    const { setProject } = useProjects(y, projectsRef);

    const visible = useMemo(() => y > window.innerHeight * 1.5, [y]);

    return (
        <div className={clsx(cn.container, visible && cn.visible)}>
            <PageOverlay
                pages={PROJECTS}
                project={project}
                setProject={setProject}
            />
            <LanguageSelect />
            {PROJECTS?.[project] && (
                <>
                    <Timespan
                        {...PROJECTS[project].date}
                    />
                    <ProjectName name={PROJECTS[project].displayName} y={y} />
                </>
            )}
            <Socials />
        </div>
    );
});
