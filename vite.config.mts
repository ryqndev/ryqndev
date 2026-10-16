import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [react(), svgr(), viteTsconfigPaths()],
    build: {
        outDir: './build',
        rollupOptions: {
            output: {
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
