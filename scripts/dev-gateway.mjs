// One origin for every app while developing, laid out the way the site is deployed:
//
//   http://localhost:3000/            -> web        (http://localhost:5173/)
//   http://localhost:3000/rimefire/   -> rimefire   (http://localhost:5174/rimefire/)
//
// Each app runs its own dev server and already serves itself under its mount path (its Vite
// `base`), so requests are forwarded untouched, hot-reload websockets included. `pnpm dev` starts
// this together with the apps (see dev.mjs); run it on its own with `pnpm dev:gateway` when the
// apps are already up.
import http from 'node:http';
import net from 'node:net';

const PORT = 3000;
/** Every app, where it is mounted, and the port its dev server listens on (apps/<name>/vite.config.mts). */
export const APPS = [
    { name: 'web', mount: '/', port: 5173 },
    { name: 'rimefire', mount: '/rimefire', port: 5174 },
];

const site = APPS.find((app) => app.mount === '/');
// the app mounted at a URL's first path segment; anything else belongs to the site itself
const appFor = (url) => APPS.find((app) => app !== site && (url === app.mount || url.startsWith(app.mount + '/') || url.startsWith(app.mount + '?'))) ?? site;

const server = http.createServer((req, res) => {
    const app = appFor(req.url);
    const [path, query] = req.url.split('?');
    // static hosts redirect /rimefire to /rimefire/, and an app's relative URLs depend on it
    if (app !== site && path === app.mount) {
        res.writeHead(302, { location: app.mount + '/' + (query ? '?' + query : '') }).end();
        return;
    }
    const upstream = http.request({ host: 'localhost', port: app.port, method: req.method, path: req.url, headers: req.headers }, (answer) => {
        res.writeHead(answer.statusCode, answer.statusMessage, answer.rawHeaders);
        answer.pipe(res);
    });
    upstream.on('error', () => {
        if (res.headersSent) res.destroy();
        else res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end(`${app.name} is not answering on port ${app.port}. It may still be starting.\n`);
    });
    req.pipe(upstream);
});

// websockets (Vite's hot reload): replay the handshake to the app's server, then splice the two sockets together
server.on('upgrade', (req, socket, first) => {
    const upstream = net.connect(appFor(req.url).port, 'localhost', () => {
        let handshake = `${req.method} ${req.url} HTTP/1.1\r\n`;
        for (let i = 0; i < req.rawHeaders.length; i += 2) handshake += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
        upstream.write(handshake + '\r\n');
        if (first.length) upstream.write(first);
        upstream.pipe(socket).pipe(upstream);
    });
    const drop = () => {
        upstream.destroy();
        socket.destroy();
    };
    upstream.on('error', drop);
    socket.on('error', drop);
});

server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `gateway: port ${PORT} is already in use` : error);
    process.exit(1);
});
server.listen(PORT, () => {
    console.log(`\n  gateway: http://localhost:${PORT}`);
    for (const app of APPS) console.log(`    ${(app.mount === '/' ? '/' : app.mount + '/').padEnd(13)} ${app.name} (:${app.port})`);
    console.log();
});
