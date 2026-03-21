import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const srcRoot = resolve(appRoot, "src");
const distRoot = resolve(appRoot, "dist");

const entryPoints = {
  background: resolve(srcRoot, "background/index.ts"),
  "content-script": resolve(srcRoot, "page/content-script.ts"),
  "injected-main": resolve(srcRoot, "page/injected-main.ts"),
  options: resolve(srcRoot, "ui/options.ts"),
  popup: resolve(srcRoot, "ui/popup.ts")
};

await rm(distRoot, {
  force: true,
  recursive: true
});

await mkdir(distRoot, {
  recursive: true
});

for (const [entryPoint, entryFile] of Object.entries(entryPoints)) {
  await build({
    entryPoints: [entryFile],
    outfile: resolve(distRoot, `${entryPoint}.js`),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    sourcemap: true,
    legalComments: "none",
    banner: {
      js: `/* Model Drive Protocol Chrome extension: ${entryPoint} */`
    }
  });
}

await copyFile(resolve(srcRoot, "manifest.json"), resolve(distRoot, "manifest.json"));

for (const asset of ["options.html", "popup.html", "styles.css"]) {
  await copyFile(resolve(srcRoot, "ui", asset), resolve(distRoot, asset));
}
