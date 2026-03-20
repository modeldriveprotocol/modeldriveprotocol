import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const targets = [
  "packages/protocol/dist",
  "packages/client/dist",
  "packages/server/dist",
  "packages/protocol/tsconfig.tsbuildinfo",
  "packages/client/tsconfig.tsbuildinfo",
  "packages/server/tsconfig.tsbuildinfo",
  "docs/.vitepress/cache",
  "docs/.vitepress/dist",
  "docs/public/assets/mdp-client.global.js",
  "docs/public/assets/mdp-client.global.js.map"
];

await Promise.all(
  targets.map((target) =>
    rm(resolve(process.cwd(), target), {
      force: true,
      recursive: true
    })
  )
);
