import clsx from 'clsx';
import { lazily } from 'react-lazily';
import { useRef } from 'react';

import PROJECTS from '@assets/projects.json';
import { ScrollableNotice } from '@components/ScrollableNotice/ScrollableNotice';

import { useScroll } from '../../controller';
import { useProjects } from './controller/useProjects';
import { BackgroundText } from './components/BackgroundText/BackgroundText';
import { Curtain } from './components/Curtain/Curtain';
import { PageOverlay } from './components/PageOverlay/PageOverlay';
import { LanguageSelect } from './components/LanguageSelect/LanguageSelect';
import { Timespan } from './components/Timespan/Timespan';
import { ProjectName } from './components/ProjectName/ProjectName';
import { Socials } from './components/Socials/Socials';

import cn from './Home.module.scss';

const { Stars } = lazily(() => import('@components/Three/Stars'));
const { Content } = lazily(() => import('./components/Content/Content'));

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

            <Content
                theme={theme}
                project={project}
                y={y}
                projectsRef={projectsRef}
            >
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
            </Content>
            {y < PAGE_BOTTOM_BREAKPOINT && <ScrollableNotice />}
        </main>
    );
};
