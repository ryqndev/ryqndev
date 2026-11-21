import { useCallback, useEffect, useState } from 'react';
import useDebounce from './useDebounce';

export const useScroll = () => {
    const [y, setY] = useState(() => window.scrollY);
    const debouncedY = useDebounce(y, 200);

    const listener = useCallback(() => {
        setY(window.scrollY);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', listener);

        return () => {
            window.removeEventListener('scroll', listener);
        };
    }, []);

    return debouncedY;
};
