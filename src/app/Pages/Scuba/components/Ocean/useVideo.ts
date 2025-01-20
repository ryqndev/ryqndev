import { useMemo, use } from "react";
import { VideoTexture } from "three";
import { blob } from "./video-utils";


export const useVideo = () => {
    const videoBlob = use(blob);
    // const sdf = use(videoRequest.then(fetchProgress({
    //     onProgress(progress) {
    //         self.setState({ progress });
    //     },
    //     onError(err) {
    //         console.log(err);
    //     },
    // })))
    // const blob = use(videoRequest.blob());

    // useEffect(() => {
    //     videoRequest.body
    // }, []);

    const video = useMemo(() => {
        if (!blob) return;
        const vid = document.createElement('video');
        const blobUrl = URL.createObjectURL(videoBlob);
        vid.src = blobUrl;
        return vid;
    }, [blob]);

    const videoTexture = useMemo(() => video ? new VideoTexture(video) : null, [video]);

    return {
        video,
        videoTexture
    };
}