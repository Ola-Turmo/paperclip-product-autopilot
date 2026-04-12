import { describe, expect, it } from "vitest";
import manifest from "../src/manifest.js";

describe("manifest", () => {
  it("uses the root build outputs as plugin entrypoints", () => {
    expect(manifest.entrypoints.worker).toBe("./dist/worker.js");
    expect(manifest.entrypoints.ui).toBe("./dist/ui");
  });

  it("declares only supported categories", () => {
    expect(manifest.categories).toEqual(["automation", "ui"]);
  });

  it("registers supported UI slot types", () => {
    expect(manifest.ui?.slots.map((slot) => slot.type)).toEqual([
      "detailTab",
      "projectSidebarItem",
      "dashboardWidget",
      "settingsPage",
      "detailTab",
    ]);
  });
});
