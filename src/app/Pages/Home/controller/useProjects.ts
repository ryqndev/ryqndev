import { useEffect, useState, useCallback } from 'react';
import type { RefObject } from 'react';

// literally what the heck is this code I wrote ????
// college me was an actual monster what the heck
export const useProjects = (y: number, ref: RefObject<HTMLDivElement | null>) => {
    const [project, _setProject] = useState(0);

    useEffect(() => {
        if (!ref.current) return;
        _setProject(
            Math.min(
                // WHAT IS THIS SQUIGGLY LINE MATH? WHY WOULD I DO THIS?
                ~~(
                    (y -
                        ref.current?.getBoundingClientRect()?.top -
                        window.innerHeight * 1.6) /
                    window.innerHeight /
                    2
                ),
                3
            )
        );
    }, [ref, y]);

    const setProject = useCallback(
        (projectid: number) => {
            if (!ref.current) return;

            window.scrollTo({
                top:
                    projectid * (window.innerHeight * 1.5) +
                    ref.current?.offsetTop,
                behavior: 'smooth',
            });
        },
        [ref]
    );

    return {
        project,
        setProject,
    };
};
