import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';

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
        preloadRouteChunks(['/packages/home/src/index.ts', '/InteractiveIsland/InteractiveIsland.tsx']),
    ],
    server: {
        // The game is its own app (apps/rimefire). In dev it runs on its own server and is reached
        // through this one at /rimefire; in production the root build copies it into this app's output.
        proxy: {
            '/rimefire': {
                target: 'http://localhost:5174',
                ws: true,
                // static hosts redirect /rimefire to /rimefire/; do the equivalent here
                rewrite: (path) => (path === '/rimefire' ? '/rimefire/' : path),
            },
        },
    },
    build: {
        outDir: './build',
        rollupOptions: {
            output: {
                // Route packages are lazy-loaded through their barrel (src/index.ts);
                // name those chunks after the package instead of "src".
                chunkFileNames(chunk) {
                    const pkg = chunk.facadeModuleId?.match(/\/packages\/([^/]+)\/src\/index\.ts$/)?.[1];
                    return pkg ? `assets/${pkg}-[hash].js` : 'assets/[name]-[hash].js';
                },
                manualChunks(id) {
                    // The rapier physics engine ships its wasm inlined as a ~2 MB
                    // base64 string. Keep it in its own chunk so it downloads in
                    // parallel with the scene code and stays cached across deploys
                    // that only touch app code.
                    if (id.includes('@dimforge/rapier3d-compat')) return 'rapier';
                },
            },
        },
    },
});
