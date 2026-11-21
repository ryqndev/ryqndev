// Bundles + minifies the game into one self-contained file that the web app serves
// statically at /rimefire: apps/web/public/rimefire/index.html
//   pnpm --filter rimefire build
// Nothing in the React app references it. Dev: `pnpm --filter rimefire dev`, then open /?dev
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, '../web/public/rimefire/index.html');

function minGlsl(src) {
    const lines = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    let s = '';
    for (const l of lines) {
        if (l[0] === '#') s += (s && !s.endsWith('\n') ? '\n' : '') + l + '\n';
        else s += (s && !s.endsWith('\n') ? ' ' : '') + l;
    }
    return s
        .split('\n')
        .map((l) => (l[0] === '#' ? l : l.replace(/\s+/g, ' ').replace(/\s*([{}()[\];,=*/<>?:&|!])\s*/g, '$1')))
        .join('\n');
}
const glsl = {
    name: 'glsl-min',
    transform(code, id) {
        if (!id.endsWith('shaders.js')) return null;
        return { code: code.replace(/`([^`]*)`/g, (_, s) => '`' + minGlsl(s) + '`'), map: null };
    },
};

const res = await build({
    configFile: false,
    root,
    logLevel: 'warn',
    plugins: [glsl],
    build: {
        write: false,
        minify: true,
        target: 'es2020',
        lib: { entry: resolve(root, 'src/main.js'), formats: ['iife'], name: 'RF' },
    },
});
const js = (Array.isArray(res) ? res[0] : res).output[0].code.replace(/<\/script/g, '<\\/script');
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    .replace(/\n\s*/g, '')
    .replace(/<script type="module"[^>]*><\/script>/, () => '<script>' + js.trim() + '</script>');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`rimefire -> ${out}\n  ${(html.length / 1024).toFixed(1)} kB, ${(gzipSync(html).length / 1024).toFixed(1)} kB gzipped`);
