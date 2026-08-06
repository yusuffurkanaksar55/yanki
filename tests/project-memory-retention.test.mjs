import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { trimMarkdownSections } from "../scripts/trim-project-memory.mjs";

const root = process.cwd();

function countSections(relativePath, pattern = /^## /gm) {
  return readFileSync(join(root, relativePath), "utf8").match(pattern)?.length ?? 0;
}

describe("project memory retention", () => {
  it("keeps the newest entries and any preserved template", () => {
    const source = [
      "# Error Log",
      "",
      "## ERR-003 - Newest",
      "new",
      "",
      "## ERR-002 - Middle",
      "middle",
      "",
      "## ERR-001 - Oldest",
      "old",
      "",
      "## ERR-YYYYMMDD-XXX - Template",
      "template"
    ].join("\n");

    expect(
      trimMarkdownSections(source, 2, (section) =>
        section.startsWith("## ERR-YYYYMMDD-XXX")
      )
    ).toBe(
      [
        "# Error Log",
        "",
        "## ERR-003 - Newest\nnew",
        "",
        "## ERR-002 - Middle\nmiddle",
        "",
        "## ERR-YYYYMMDD-XXX - Template\ntemplate",
        ""
      ].join("\n")
    );
  });

  it("keeps repository operational logs within their configured limits", () => {
    expect(countSections("docs/DEVELOPMENT_LOG.md")).toBeLessThanOrEqual(5);
    expect(countSections("docs/TEST_REPORT.md")).toBeLessThanOrEqual(5);
    expect(
      countSections("docs/ERROR_LOG.md", /^## ERR-(?!YYYYMMDD).+/gm)
    ).toBeLessThanOrEqual(10);
  });
});
