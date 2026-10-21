import { useProgress } from '@react-three/drei';
import { useLoadingStore } from 'app/controller/loading/loading.store';
import { useEffect } from 'react';

/**
 * Mirrors three.js loader progress (drei's useProgress) into the app-level
 * loading store. This lives in the Home chunk so the loading splash, which
 * renders from the entry chunk, doesn't have to import three.js to read it.
 */
export const LoadingProgressBridge = () => {
    const progress = useProgress((state) => state.progress);
    const setProgress = useLoadingStore((state) => state.setProgress);

    useEffect(() => {
        setProgress(progress);
    }, [progress, setProgress]);

    return null;
};
