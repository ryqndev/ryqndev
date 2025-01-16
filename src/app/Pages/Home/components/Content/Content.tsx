import { memo } from 'react';
import PROJECTS from '@assets/projects.json';
import cn from './Content.module.scss';
import { InteractiveIsland } from './components/InteractiveIsland/InteractiveIsland';
import { Overlays } from './components/Overlays/Overlays';

interface ContentProps {
    project: any;
    projectsRef: any;
}

// this is the amount the user can "scroll" through - scales with
// the # of projects that can be shown
const STYLES = { height: (PROJECTS.length - 1) * 200 + 'vh' };

export const Content = memo(function Content({
    project,
    projectsRef,
}: ContentProps) {
    return (
        <div
            style={STYLES}
            ref={projectsRef}
        >
            <div className={cn.container}>
                <InteractiveIsland project={project} />
                <Overlays project={project} projectsRef={projectsRef} />
            </div>
        </div>
    );
});
