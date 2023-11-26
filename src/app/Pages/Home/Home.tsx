import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useScroll } from '../../controller';
import { useProjects } from './controller/useProjects';
import { ScrollableNotice } from '../../components';
import {
    BackgroundText,
    Curtain,
    LanguageSelect,
    PageOverlay,
    ProjectName,
    Socials,
    Experience,
    Timespan,
} from './components';
import PROJECTS from '../../assets/projects.json';
import cn from './Home.module.scss';
import { Stars } from '../../components/Three/Stars';

export const Home = ({ theme }: { theme: number }) => {
    const projectsRef = useRef<HTMLDivElement>(null);
    const y = useScroll();
    const { project, setProject } = useProjects(y, projectsRef);

    return (
        <main className={cn.container}>
            <div
                className={clsx(
                    cn.header,
                    y > window.innerHeight && cn.disappear
                )}
            >
                {y < window.innerHeight * 1.5 && <Curtain y={y} />}
            </div>
            <Stars project={project} />
            <BackgroundText
                visible={
                    y > window.innerHeight / 2 && y < window.innerHeight * 6
                }
            />
            <div
                className={cn.content}
                style={{ height: (PROJECTS.length - 1) * 200 + 'vh' }}
                ref={projectsRef}
            >
                <Experience theme={theme} project={project} y={y}>
                    <div className={clsx(cn.controls)}>
                        <PageOverlay
                            visible={y > window.innerHeight * 1.5}
                            pages={PROJECTS}
                            project={project}
                            setProject={setProject}
                        />
                        <LanguageSelect
                            visible={y > window.innerHeight * 1.5}
                        />
                        {PROJECTS?.[project] && (
                            <>
                                <Timespan
                                    {...PROJECTS[project].date}
                                    visible={y > window.innerHeight}
                                />
                                <ProjectName
                                    name={PROJECTS[project].displayName}
                                    y={y}
                                />
                            </>
                        )}
                        <Socials />
                    </div>
                </Experience>
            </div>
            {y < window.innerHeight * 6 && <ScrollableNotice />}
        </main>
    );
};
