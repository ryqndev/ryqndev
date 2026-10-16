import { ScrollableNotice } from '@components/ScrollableNotice/ScrollableNotice';
import { useScroll } from 'app/controller/hooks/useScroll';
import clsx from 'clsx';
import { memo, useRef } from 'react';

import { BackgroundText } from './components/BackgroundText/BackgroundText';
import { Stars } from './components/Content/components/InteractiveIsland/Stars';
import { Content } from './components/Content/Content';
import { Curtain } from './components/Curtain/Curtain';
import { useProjects } from './controller/useProjects';
import cn from './Home.module.scss';


export const Home = memo(function Home() {
    const projectsRef = useRef<HTMLDivElement>(null);
    const { project } = useProjects(projectsRef);

    // Threshold selectors: Home re-renders when one of these flips, not on
    // every scroll frame.
    const headerHidden = useScroll((y) => y > window.innerHeight);
    const curtainMounted = useScroll((y) => y <= window.innerHeight * 1.5);
    const backgroundTextVisible = useScroll((y) => y > window.innerHeight / 2);

    return (
        <main className={cn.container}>
            <div className={clsx(cn.header, headerHidden && cn.disappear)}>
                {/* Fully faded out by 1.5 screens; unmount it so its fixed layer
                    and gradient animation stop costing anything after that. */}
                {curtainMounted && <Curtain />}
            </div>
            <ScrollableNotice />
            <Stars project={project} />
            <BackgroundText visible={backgroundTextVisible} />
            <Content project={project} projectsRef={projectsRef} />
        </main>
    );
});
