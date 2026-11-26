import { readFile } from 'node:fs/promises';

import react from '@vitejs/plugin-react-swc';
import { defineConfig, type Plugin } from 'vite';

/**
 * Shaders are imported as raw strings (`*.glsl?raw`). In production builds this strips their
 * comments and whitespace so they cost as little to ship as hand-minified sources.
 * Preprocessor lines keep their own line; everything else is joined.
 */
const minifyGlsl = (): Plugin => ({
    name: 'minify-glsl',
    apply: 'build',
    enforce: 'pre',
    async load(id) {
        if (!id.endsWith('.glsl?raw')) return null;
        const source = await readFile(id.slice(0, -'?raw'.length), 'utf8');
        const lines = source
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        let joined = '';
        for (const line of lines) {
            const fresh = !joined || joined.endsWith('\n');
            if (line[0] === '#') joined += (fresh ? '' : '\n') + line + '\n';
            else joined += (fresh ? '' : ' ') + line;
        }
        const out = joined
            .split('\n')
            .map((line) => (line[0] === '#' ? line : line.replace(/\s+/g, ' ').replace(/\s*([{}()[\];,=*/<>?:&|!])\s*/g, '$1')))
            .join('\n');
        return `export default ${JSON.stringify(out)};`;
    },
});

export default defineConfig({
    // served under /brinewake: scripts/dev-gateway.mjs puts it there in dev
    base: '/brinewake/',
    plugins: [react(), minifyGlsl()],
    server: {
        port: 5175,
        strictPort: true,
    },
    build: {
        outDir: './build',
    },
});
