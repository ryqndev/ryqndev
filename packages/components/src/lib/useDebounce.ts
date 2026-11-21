import { useEffect, useState } from 'react';

export default function useDebounce<T>(value: T, delay = 25) {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const [ignore, setIgnore] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    useEffect(() => {
        if (ignore) return;

        setDebouncedValue(value);
        setIgnore(true);
        setTimeout(() => {
            setIgnore(false);
            setDebouncedValue(value);
        }, delay);
    }, [value, delay]);

    return debouncedValue;
}
