import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getUiBuildSnapshot, startPluginDevServer } from "@paperclipai/plugin-sdk";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const uiDir = "dist/ui";
const indexPath = resolve(rootDir, uiDir, "index.js");
const port = 4300 + Math.floor(Math.random() * 200);

function fail(message) {
  throw new Error(`dev server smoke failed: ${message}`);
}

const snapshot = await getUiBuildSnapshot(rootDir, uiDir);
if (snapshot.length === 0) {
  fail("UI build snapshot is empty; run the build first");
}

if (!snapshot.some((entry) => entry.file.replace(/\\/g, "/") === "index.js")) {
  fail(`UI bundle is missing from snapshot: ${indexPath}`);
}

const server = await startPluginDevServer({
  rootDir,
  uiDir,
  host: "127.0.0.1",
  port,
});

try {
  const healthResponse = await fetch(`${server.url}/__paperclip__/health`);
  if (!healthResponse.ok) {
    fail(`health endpoint returned ${healthResponse.status}`);
  }

  const healthText = await healthResponse.text();
  if (!healthText.toLowerCase().includes("ok")) {
    fail(`unexpected health response: ${healthText}`);
  }

  const uiResponse = await fetch(`${server.url}/index.js`);
  if (!uiResponse.ok) {
    fail(`index.js returned ${uiResponse.status}`);
  }

  const uiText = await uiResponse.text();
  if (!uiText.includes("Autopilot")) {
    fail("served UI bundle does not look like the plugin UI bundle");
  }
} finally {
  await server.close();
}

console.log("dev server smoke passed");
