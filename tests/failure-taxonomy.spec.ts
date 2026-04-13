import { describe, expect, it } from "vitest";
import { classifyFailureMessage, formatFailureCategory } from "../src/services/failure-taxonomy.js";

describe("failure taxonomy", () => {
  it("classifies common failure messages", () => {
    expect(classifyFailureMessage("vitest assertion failed in onboarding suite")).toBe("test_failure");
    expect(classifyFailureMessage("TypeScript build failed during tsc step")).toBe("build_failure");
    expect(classifyFailureMessage("merge conflict on main branch")).toBe("merge_conflict");
    expect(classifyFailureMessage("request timed out after 30s")).toBe("timeout");
    expect(classifyFailureMessage("schema validation error on digest payload")).toBe("validation_error");
    expect(classifyFailureMessage("ECONNRESET while fetching API")).toBe("network_error");
  });

  it("formats categories for display", () => {
    expect(formatFailureCategory("build_failure")).toBe("build failure");
    expect(formatFailureCategory(null)).toBeNull();
  });
});
