// Regenerates the root tsconfig.json project references from the workspace
// layout so `tsc -b` always covers every app and package. Runs as part of
// `pnpm compile`; create-pkg.sh also runs it after scaffolding a package.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

const refs = ["apps", "packages"]
    .flatMap(dir =>
        readdirSync(join(root, dir), { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => `./${dir}/${entry.name}`),
    )
    .filter(pkg => existsSync(join(root, pkg, "tsconfig.json")))
    .sort();

const body = refs.map(pkg => `        { "path": "${pkg}" }`).join(",\n");
const next = `{\n    "files": [],\n    "references": [\n${body}\n    ]\n}\n`;

const file = join(root, "tsconfig.json");
if (readFileSync(file, "utf8") !== next) {
    writeFileSync(file, next);
    console.log(`tsconfig.json: references synced (${refs.length} projects)`);
}
