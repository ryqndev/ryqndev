// All panorama frames as hashed asset URLs, resolved at build time in one go.
// (Previously 28 sequential `await import()`s at runtime, one round trip each.)
const frames = import.meta.glob('./shaws-compressed/*.webp', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

const ordered = Object.entries(frames)
    .map(([path, url]) => [Number(path.match(/(\d+)\.webp$/)![1]), url] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, url]) => url);

export const useImages = () => ordered;
