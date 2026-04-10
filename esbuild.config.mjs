import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

// Resolve the plugin-sdk from the paperclip monorepo
const sdkPath = resolve(__dirname, "../paperclip/packages/plugins/sdk/src");

const workerBuild = {
  entryPoints: [resolve(__dirname, "src/worker.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: resolve(__dirname, "dist/worker.js"),
  external: ["@paperclipai/plugin-sdk"],
  alias: {
    "@paperclipai/plugin-sdk": sdkPath,
  },
  logLevel: "info",
};

const manifestBuild = {
  entryPoints: [resolve(__dirname, "src/manifest.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: resolve(__dirname, "dist/manifest.js"),
  external: ["@paperclipai/plugin-sdk"],
  alias: {
    "@paperclipai/plugin-sdk": sdkPath,
  },
  logLevel: "info",
};

// Stub UI so the plugin loads without crashing
// Real UI will be added in Milestone 4
const uiBuild = {
  entryPoints: [resolve(__dirname, "src/ui/index.tsx")],
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "esm",
  outdir: resolve(__dirname, "dist/ui"),
  external: [],
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
    ".css": "css",
  },
  alias: {
    "@paperclipai/plugin-sdk": sdkPath,
  },
  logLevel: "info",
};

async function build() {
  try {
    await esbuild.build(manifestBuild);
    await esbuild.build(workerBuild);
    await esbuild.build(uiBuild);
    console.log("Build complete");
  } catch {
    process.exit(1);
  }
}

if (isWatch) {
  const ctx = await esbuild.context(manifestBuild);
  const ctx2 = await esbuild.context(workerBuild);
  const ctx3 = await esbuild.context(uiBuild);
  await ctx.watch();
  await ctx2.watch();
  await ctx3.watch();
  console.log("Watching for changes...");
} else {
  build();
}
