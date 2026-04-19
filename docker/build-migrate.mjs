import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(root, "lib/db/migrate.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(root, "artifacts/api-server/dist/migrate.mjs"),
  external: ["pg-native"],
  banner: {
    js: `import { createRequire as __cr } from 'node:module'; globalThis.require = __cr(import.meta.url);`,
  },
});

console.log("Migration bundle built successfully.");
