import clsx from 'clsx';
import { memo, useRef } from 'react';

import { ScrollableNotice } from '@components/ScrollableNotice/ScrollableNotice';

import { useProjects } from './controller/useProjects';
import { BackgroundText } from './components/BackgroundText/BackgroundText';
import { Curtain } from './components/Curtain/Curtain';

import cn from './Home.module.scss';
import { useScroll } from 'app/controller/hooks/useScroll';
import { Content } from './components/Content/Content';
import { Stars } from './components/Content/components/InteractiveIsland/Stars';


export const Home = memo(function Home() {
    const projectsRef = useRef<HTMLDivElement>(null);
    const y = useScroll();
    const { project } = useProjects(y, projectsRef);

    const CURTAIN_BREAKPOINT = window.innerHeight * 1.5;
    const BACKGROUND_TEXT_BREAKPOINT = window.innerHeight / 2;

    return (
        <main className={cn.container}>
            <div
                className={clsx(
                    cn.header,
                    y > window.innerHeight && cn.disappear
                )}
            >
                <Curtain
                    y={y < CURTAIN_BREAKPOINT ? y : CURTAIN_BREAKPOINT}
                />
            </div>
            <ScrollableNotice />
            <Stars project={project} />
            <BackgroundText visible={y > BACKGROUND_TEXT_BREAKPOINT} />
            <Content project={project} projectsRef={projectsRef} />
        </main>
    );
});
