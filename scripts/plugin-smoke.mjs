import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

function fail(message) {
  throw new Error(`plugin smoke failed: ${message}`);
}

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}

const packageJsonPath = resolve(rootDir, "package.json");
const readmePath = resolve(rootDir, "README.md");
const manifestPath = resolve(rootDir, "dist/manifest.js");
const workerPath = resolve(rootDir, "dist/worker.js");
const uiBundlePath = resolve(rootDir, "dist/ui/index.js");

for (const requiredPath of [packageJsonPath, readmePath, manifestPath, workerPath, uiBundlePath]) {
  if (!(await fileExists(requiredPath))) {
    fail(`missing required artifact: ${requiredPath}`);
  }
}

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const readme = await readFile(readmePath, "utf8");
const manifestModule = await import(pathToFileURL(manifestPath).href);
const uiModule = await import(pathToFileURL(uiBundlePath).href);
const manifest = manifestModule.default;

if (!manifest || typeof manifest !== "object") {
  fail("manifest default export is missing");
}

if (manifest.entrypoints?.worker !== "./dist/worker.js") {
  fail(`unexpected worker entrypoint: ${manifest.entrypoints?.worker}`);
}

if (normalizePath(manifest.entrypoints?.ui ?? "") !== "./dist/ui") {
  fail(`unexpected ui entrypoint: ${manifest.entrypoints?.ui}`);
}

if (packageJson.exports?.["."] !== "./dist/manifest.js") {
  fail(`package export does not point to dist manifest: ${packageJson.exports?.["."]}`);
}

if (normalizePath(packageJson.paperclipPlugin?.manifest ?? "") !== "./dist/manifest.js") {
  fail(`paperclipPlugin.manifest does not point to dist manifest: ${packageJson.paperclipPlugin?.manifest}`);
}

if (normalizePath(packageJson.paperclipPlugin?.worker ?? "") !== "./dist/worker.js") {
  fail(`paperclipPlugin.worker does not point to dist worker: ${packageJson.paperclipPlugin?.worker}`);
}

if (normalizePath(packageJson.paperclipPlugin?.ui ?? "") !== "./dist/ui") {
  fail(`paperclipPlugin.ui does not point to dist ui: ${packageJson.paperclipPlugin?.ui}`);
}

const exportedUiNames = new Set([
  ...Object.keys(uiModule),
  ...Object.keys(uiModule.default ?? {}),
]);

for (const slot of manifest.ui?.slots ?? []) {
  if (typeof slot.exportName !== "string" || !exportedUiNames.has(slot.exportName)) {
    fail(`UI slot export is missing from bundle: ${slot.exportName}`);
  }
}

const readmeAssets = Array.from(
  readme.matchAll(/\.\/*assets\/readme\/([A-Za-z0-9._-]+\.(?:svg|png|jpg|jpeg|webp))/g),
  (match) => `assets/readme/${match[1]}`,
);

if (readmeAssets.length === 0) {
  fail("README does not reference any packaged assets");
}

const packageFiles = new Set(packageJson.files ?? []);
if (!packageFiles.has("assets/readme")) {
  fail("package.json files is missing assets/readme");
}

for (const asset of readmeAssets) {
  const assetPath = resolve(rootDir, asset);
  if (!(await fileExists(assetPath))) {
    fail(`README asset is missing: ${asset}`);
  }
}

console.log("plugin smoke passed");
