import * as esbuild from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

const sdkPath = resolve(__dirname, "../paperclip/packages/plugins/sdk/src");

const baseConfig = {
  platform: "node",
  target: "node20",
  format: "esm",
  external: [],
  alias: { "@paperclipai/plugin-sdk": sdkPath },
  logLevel: "info",
};

async function build() {
  // Root manifest
  await esbuild.build({
    ...baseConfig,
    entryPoints: [resolve(__dirname, "src/manifest.ts")],
    bundle: true,
    outfile: resolve(__dirname, "dist/manifest.js"),
  });

  // Root worker (used by nested worker via dynamic import)
  await esbuild.build({
    ...baseConfig,
    entryPoints: [resolve(__dirname, "src/worker.ts")],
    bundle: true,
    outfile: resolve(__dirname, "dist/worker.js"),
  });

  // Nested autopilot manifest
  await esbuild.build({
    ...baseConfig,
    entryPoints: [resolve(__dirname, "src/autopilot/manifest.ts")],
    bundle: true,
    outfile: resolve(__dirname, "dist/autopilot/manifest.js"),
  });

  // Nested autopilot worker
  await esbuild.build({
    ...baseConfig,
    entryPoints: [resolve(__dirname, "src/autopilot/worker.ts")],
    bundle: true,
    outfile: resolve(__dirname, "dist/autopilot/worker.js"),
  });

  // Autopilot UI (browser target)
  await esbuild.build({
    ...baseConfig,
    platform: "browser",
    target: "es2020",
    entryPoints: [resolve(__dirname, "src/autopilot/ui/index.tsx")],
    bundle: true,
    outdir: resolve(__dirname, "dist/autopilot/ui"),
    loader: { ".tsx": "tsx", ".ts": "ts", ".css": "css" },
    external: [],
  });

  console.log("Build complete");
}

async function watch() {
  const ctx1 = await esbuild.context({ ...baseConfig, entryPoints: [resolve(__dirname, "src/manifest.ts")], bundle: true, outfile: resolve(__dirname, "dist/manifest.js") });
  const ctx2 = await esbuild.context({ ...baseConfig, entryPoints: [resolve(__dirname, "src/worker.ts")], bundle: true, outfile: resolve(__dirname, "dist/worker.js") });
  const ctx3 = await esbuild.context({ ...baseConfig, entryPoints: [resolve(__dirname, "src/autopilot/manifest.ts")], bundle: true, outfile: resolve(__dirname, "dist/autopilot/manifest.js") });
  const ctx4 = await esbuild.context({ ...baseConfig, entryPoints: [resolve(__dirname, "src/autopilot/worker.ts")], bundle: true, outfile: resolve(__dirname, "dist/autopilot/worker.js") });
  const ctx5 = await esbuild.context({
    ...baseConfig,
    platform: "browser",
    target: "es2020",
    entryPoints: [resolve(__dirname, "src/autopilot/ui/index.tsx")],
    bundle: true,
    outdir: resolve(__dirname, "dist/autopilot/ui"),
    loader: { ".tsx": "tsx", ".ts": "ts", ".css": "css" },
    external: [],
  });
  await ctx1.watch(); await ctx2.watch(); await ctx3.watch(); await ctx4.watch(); await ctx5.watch();
  console.log("Watching for changes...");
}

if (isWatch) {
  watch().catch(() => process.exit(1));
} else {
  build().catch(() => process.exit(1));
}
