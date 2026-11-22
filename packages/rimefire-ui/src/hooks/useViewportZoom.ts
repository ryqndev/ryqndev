import { useEffect, useState } from 'react';

const zoomFor = (width: number) => Math.max(1, Math.min(1.8, width / 1500));

/** UI scale for the current viewport: the HUD is authored for ~1500px and grows on wider screens. */
export function useViewportZoom() {
    const [zoom, setZoom] = useState(() => zoomFor(window.innerWidth));
    useEffect(() => {
        const fit = () => setZoom(zoomFor(window.innerWidth));
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, []);
    return zoom;
}
