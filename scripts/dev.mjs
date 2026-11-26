// `pnpm dev`: every app's own dev server, plus the gateway that puts them all behind
// http://localhost:3000 (dev-gateway.mjs, which starts listening when imported).
import { spawn } from 'node:child_process';

import { APPS } from './dev-gateway.mjs';

const apps = spawn('pnpm', ['--parallel', ...APPS.flatMap((app) => ['--filter', app.name]), 'dev'], { stdio: 'inherit' });
// the gateway is no use without the apps, and they should not outlive it
apps.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => apps.kill(signal));
