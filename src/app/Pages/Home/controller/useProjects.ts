import { useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import { refreshScroll, useScroll } from 'app/controller/hooks/useScroll';

const MAX_PROJECT = 3;

// literally what the heck is this code I wrote ????
// college me was an actual monster what the heck
// (formula preserved as-is; it just runs as a scroll selector now, so the
// caller only re-renders when the resulting index changes)
const projectAt = (y: number, el: HTMLDivElement | null) =>
    el
        ? Math.min(
              // WHAT IS THIS SQUIGGLY LINE MATH? WHY WOULD I DO THIS?
              ~~(
                  (y -
                      el.getBoundingClientRect().top -
                      window.innerHeight * 1.6) /
                  window.innerHeight /
                  2
              ),
              MAX_PROJECT
          )
        : 0;

export const useProjects = (ref: RefObject<HTMLDivElement | null>) => {
    const project = useScroll((y) => projectAt(y, ref.current));

    // The ref is attached after the first render; re-evaluate once it exists
    // (matters when the page loads already scrolled, e.g. a reload mid-page).
    useEffect(() => {
        refreshScroll();
    }, []);

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
