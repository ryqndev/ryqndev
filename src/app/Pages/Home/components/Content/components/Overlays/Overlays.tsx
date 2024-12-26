import clsx from "clsx";
import { memo } from "react";
import { PageOverlay } from "./components/PageOverlay/PageOverlay";
import { LanguageSelect } from "./components/LanguageSelect/LanguageSelect";
import { Timespan } from "./components/Timespan/Timespan";
import { ProjectName } from "./components/ProjectName/ProjectName";
import { Socials } from "./components/Socials/Socials";
import PROJECTS from '@assets/projects.json';

import cn from '../../../../Home.module.scss';
import { useProjects } from "@pages/Home/controller/useProjects";
import { useScroll } from "app/controller/hooks/useScroll";

export const Overlays = memo(function Overlays({ project, projectsRef }: { project: any, projectsRef: any }) {
    const CURTAIN_BREAKPOINT = window.innerHeight * 1.5;
    const y = useScroll();
    const { setProject } = useProjects(y, projectsRef);


    return <div className={clsx(cn.controls)}>
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
})