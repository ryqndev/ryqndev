import { ScrollableNotice } from '@components/ScrollableNotice/ScrollableNotice';
import { useScroll } from 'app/controller/hooks/useScroll';
import clsx from 'clsx';
import { memo, useRef } from 'react';

import { BackgroundText } from './components/BackgroundText/BackgroundText';
import { Stars } from './components/Content/components/InteractiveIsland/Stars';
import { Content } from './components/Content/Content';
import { Curtain } from './components/Curtain/Curtain';
import { LoadingProgressBridge } from './components/LoadingProgressBridge';
import { useProjects } from './controller/useProjects';
import cn from './Home.module.scss';


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
                {/* Fully faded out by 1.5 screens; unmount it so its fixed layer
                    and gradient animation stop costing anything after that. */}
                {y <= CURTAIN_BREAKPOINT && <Curtain />}
            </div>
            <ScrollableNotice />
            <Stars project={project} />
            <BackgroundText visible={y > BACKGROUND_TEXT_BREAKPOINT} />
            <Content project={project} projectsRef={projectsRef} />
            <LoadingProgressBridge />
        </main>
    );
});
