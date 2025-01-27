import { use, useMemo } from "react";

export const useImages = () => {
    const imageLinks = useMemo(async () => {
        const arr: string[] = [];
        for (var i = 1; i <= 28; i++) {
            arr.push((await import(`./shaws-compressed/${i.toString()}.jpg`)).default);
        }
        return arr;
    }, []);
    const images = use(imageLinks);

    return images;
}