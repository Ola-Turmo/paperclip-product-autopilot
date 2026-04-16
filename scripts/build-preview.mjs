import * as esbuild from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const outDir = resolve(rootDir, "preview-dist");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await esbuild.build({
  absWorkingDir: rootDir,
  entryPoints: [resolve(rootDir, "preview/app.tsx")],
  bundle: true,
  outfile: resolve(outDir, "app.js"),
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  loader: { ".tsx": "tsx", ".ts": "ts" },
  alias: {
    "@paperclipai/plugin-sdk/ui": resolve(rootDir, "preview/mock-plugin-ui.tsx"),
  },
});

await cp(resolve(rootDir, "preview/index.html"), resolve(outDir, "index.html"));
console.log("preview build complete");
