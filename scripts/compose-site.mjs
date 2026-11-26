// Assembles the deployable site: the web app's build plus every other app mounted under its path.
// Runs at the end of `pnpm build`; `pnpm run deploy` then publishes apps/web/build to the gh-pages
// branch. It has to be `pnpm run deploy`: bare `pnpm deploy` is a pnpm built-in that never reaches
// the script (it exits with ERR_PNPM_NOTHING_TO_DEPLOY and publishes nothing).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const site = join(root, 'apps/web/build');

// app build output -> path it is served from
const mounts = { 'apps/rimefire/build': 'rimefire', 'apps/brinewake/build': 'brinewake' };

for (const [from, to] of Object.entries(mounts)) {
    const src = join(root, from);
    if (!existsSync(src)) throw new Error(`${from} is missing: build that app first`);
    const dest = join(site, to);
    rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, { recursive: true });
    console.log(`site: ${from} -> /${to}`);
}
