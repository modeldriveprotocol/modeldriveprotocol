import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

await build({
  entryPoints: [resolve(packageRoot, "dist/global.js")],
  outfile: resolve(packageRoot, "dist/mdp-client.global.js"),
  bundle: true,
  format: "iife",
  globalName: "MDP",
  platform: "browser",
  target: "es2020",
  sourcemap: true,
  banner: {
    js: "/* Model Drive Protocol browser bundle */"
  }
});
