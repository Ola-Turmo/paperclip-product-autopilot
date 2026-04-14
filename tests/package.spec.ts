import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const readme = readFileSync(resolve(repoRoot, "README.md"), "utf8");

describe("package metadata", () => {
  it("ships the README image assets referenced by the package readme", () => {
    expect(packageJson.files).toContain("assets/readme");
  });

  it("references only existing readme assets", () => {
    const assets = Array.from(
      readme.matchAll(/\.\/*assets\/readme\/([A-Za-z0-9._-]+\.(?:svg|png|jpg|jpeg|webp))/g),
      (match) => resolve(repoRoot, "assets/readme", match[1]),
    );

    expect(assets.length).toBeGreaterThan(0);
    expect(assets.every((assetPath) => existsSync(assetPath))).toBe(true);
  });
});
