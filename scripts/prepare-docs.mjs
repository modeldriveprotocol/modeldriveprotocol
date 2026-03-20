import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourceBundle = resolve(root, "packages/client/dist/mdp-client.global.js");
const sourceMap = resolve(root, "packages/client/dist/mdp-client.global.js.map");
const targetDir = resolve(root, "docs/public/assets");

await mkdir(targetDir, { recursive: true });
await copyFile(sourceBundle, resolve(targetDir, "mdp-client.global.js"));
await copyFile(sourceMap, resolve(targetDir, "mdp-client.global.js.map"));
