import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';

/**
 * Vite only emits <link rel="modulepreload"> for the entry's static imports.
 * The Home route and the island scene are dynamic imports that every visit
 * needs, so without hints the browser discovers them one round trip at a time
 * (entry -> Home -> InteractiveIsland -> models). This injects preload hints
 * for those chunks and their dependencies into index.html at build time.
 */
const preloadRouteChunks = (facadeSuffixes: string[]): Plugin => {
    let base = '/';
    return {
        name: 'preload-route-chunks',
        apply: 'build',
        configResolved(config) {
            base = config.base;
        },
        transformIndexHtml: {
            order: 'post',
            handler(html, ctx) {
                const bundle = ctx.bundle;
                if (!bundle) return;

                const files = new Set<string>();
                const add = (fileName: string) => {
                    const chunk = bundle[fileName];
                    if (!chunk || chunk.type !== 'chunk' || files.has(fileName)) return;
                    files.add(fileName);
                    chunk.imports.forEach(add);
                };
                for (const chunk of Object.values(bundle)) {
                    if (
                        chunk.type === 'chunk' &&
                        chunk.facadeModuleId &&
                        facadeSuffixes.some((suffix) => chunk.facadeModuleId!.endsWith(suffix))
                    ) {
                        add(chunk.fileName);
                    }
                }

                return [...files]
                    .filter((fileName) => !html.includes(fileName))
                    .map((fileName) => ({
                        tag: 'link',
                        attrs: { rel: 'modulepreload', crossorigin: true, href: base + fileName },
                        injectTo: 'head' as const,
                    }));
            },
        },
    };
};

export default defineConfig({
    plugins: [
        react(),
        svgr(),
        viteTsconfigPaths(),
        preloadRouteChunks(['/Home/Home.tsx', '/InteractiveIsland/InteractiveIsland.tsx']),
    ],
    build: {
        outDir: './build',
    },
});
