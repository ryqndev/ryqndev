import videoUrl from '../assets/heavily-reduced-f360.mp4';

const getVideoBlobPromise = async () => {
    const videoPromise = await fetch(videoUrl);
    const blob = await videoPromise.blob();
    return blob;
}


export const blob = getVideoBlobPromise();