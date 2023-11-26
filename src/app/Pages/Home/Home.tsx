import clsx from 'clsx';
import { useRef } from 'react';
import { useScroll } from '../../controller';
import { useProjects } from './controller/useProjects';

import PROJECTS from '@assets/projects.json';
import cn from './Home.module.scss';
import { Stars } from '../../components/Three/Stars';
import { BackgroundText } from './components/BackgroundText/BackgroundText';
import { Curtain } from './components/Curtain/Curtain';
import { PageOverlay } from './components/PageOverlay/PageOverlay';
import { LanguageSelect } from './components/LanguageSelect/LanguageSelect';
import { Timespan } from './components/Timespan/Timespan';
import { ProjectName } from './components/ProjectName/ProjectName';
import { Socials } from './components/Socials/Socials';
import { ScrollableNotice } from '@components/ScrollableNotice/ScrollableNotice';
import { lazily } from 'react-lazily';
const { Experience } = lazily(
    () => import('./components/Experience/Experience')
);

export const Home = ({ theme }: { theme: number }) => {
    const projectsRef = useRef<HTMLDivElement>(null);
    const y = useScroll();
    const { project, setProject } = useProjects(y, projectsRef);

    const CURTAIN_BREAKPOINT = window.innerHeight * 1.5;
    const BACKGROUND_TEXT_BREAKPOINT = window.innerHeight / 2;
    const PAGE_BOTTOM_BREAKPOINT =
        document.documentElement.scrollHeight - window.innerHeight;

    return (
        <main className={cn.container}>
            <div
                className={clsx(
                    cn.header,
                    y > window.innerHeight && cn.disappear
                )}
            >
                {y < CURTAIN_BREAKPOINT && <Curtain y={y} />}
            </div>
            <Stars project={project} />
            <BackgroundText visible={y > BACKGROUND_TEXT_BREAKPOINT} />
            <div
                className={cn.content}
                style={{ height: (PROJECTS.length - 1) * 200 + 'vh' }}
                ref={projectsRef}
            >
                <Experience theme={theme} project={project} y={y}>
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
            {y < PAGE_BOTTOM_BREAKPOINT && <ScrollableNotice />}
        </main>
    );
};
