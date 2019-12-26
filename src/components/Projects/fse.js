import imagesLoaded from 'imagesloaded';
import GridToFullscreenEffect from '../../assets/libraries/fs-effect';

let fsEffect;

const load = (display, close) => {
    const fsEffect = createfse(display, close);
    imagesLoaded(document.querySelectorAll("img"), instance => {
        let images = [];
        for (var i = 0, imageSet = {}; i < instance.elements.length; i++) {
            let image = {
                element: instance.elements[i],
                image: instance.images[i].isLoaded ? instance.images[i].img : null
            };
            if (i % 2 === 0) imageSet = { small: image };
            else images.push({ ...imageSet, large: image });
        }
        fsEffect.createTextures(images);
    });
}
function createfse(display, close) {
    const smallImages = [
        ...document.body.querySelectorAll("img:not(.img-large)")
    ];
    const canvasWrapper = document.getElementById("ps-c");
    fsEffect = new GridToFullscreenEffect(
        canvasWrapper,
        document.getElementById("ps-project"),
        {
            scrollContainer: window,
            onToFullscreenFinish: ({ index }) => {},
            onToGridStart: ({ index }) => {
                close(index);
            },
            onProgressChange: ({ index, progress }) => {
                let opacity = progress > 0 ? 0 : 1;
                smallImages[index].style.opacity = opacity;
            },
            onToFullscreenStart: ({ index }) => {
                display(index);
                smallImages[index].style.opacity = 0;
            },
            onToGridFinish: ({ lastIndex }) => {
                smallImages[lastIndex].style.opacity = 1;
            },
            duration: 0.75,
            timing: { type: "sameEnd" },
            activation: {
                type: "closestCorner", props: { onMouse: true }
            },
            transformation: {
                type: "simplex",
                props: {
                    seed: "8000",
                    frequency: 0.1,
                    amplitude: 1
                }
            }
        }
    );
    fsEffect.init();
    fsEffect.forceInitializePlane(0);
    return fsEffect;
}
let togglefs = () => {
    if (fsEffect.isAnimating) return;
    if (fsEffect.isFullscreen) fsEffect.toGrid();
    if (!fsEffect.isFullscreen) fsEffect.toFullscreen();
}

export default{
    load: load,
    toggle: togglefs,
}