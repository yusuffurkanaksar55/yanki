import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const retentionPolicies = [
  {
    path: "docs/DEVELOPMENT_LOG.md",
    maximumEntries: 5
  },
  {
    path: "docs/TEST_REPORT.md",
    maximumEntries: 5
  },
  {
    path: "docs/ERROR_LOG.md",
    maximumEntries: 10,
    preserveSection(section) {
      return /^## ERR-YYYYMMDD-XXX\b/m.test(section);
    }
  }
];

export function trimMarkdownSections(
  source,
  maximumEntries,
  preserveSection = () => false
) {
  const normalizedSource = source.replace(/\r\n/g, "\n").trimEnd();
  const sectionMatches = [...normalizedSource.matchAll(/^## .+$/gm)];

  if (sectionMatches.length === 0) {
    return `${normalizedSource}\n`;
  }

  const preamble = normalizedSource.slice(0, sectionMatches[0].index).trimEnd();
  const sections = sectionMatches.map((match, index) => {
    const nextMatch = sectionMatches[index + 1];
    return normalizedSource
      .slice(match.index, nextMatch?.index ?? normalizedSource.length)
      .trim();
  });
  const retainedEntries = sections
    .filter((section) => !preserveSection(section))
    .slice(0, maximumEntries);
  const preservedSections = sections.filter(preserveSection);

  return `${[preamble, ...retainedEntries, ...preservedSections].join("\n\n")}\n`;
}

function run() {
  const checkOnly = process.argv.includes("--check");
  const changedPaths = [];

  for (const policy of retentionPolicies) {
    const absolutePath = resolve(policy.path);
    const source = readFileSync(absolutePath, "utf8");
    const trimmed = trimMarkdownSections(
      source,
      policy.maximumEntries,
      policy.preserveSection
    );

    if (source.replace(/\r\n/g, "\n") === trimmed) {
      continue;
    }

    changedPaths.push(policy.path);

    if (!checkOnly) {
      writeFileSync(absolutePath, trimmed, "utf8");
    }
  }

  if (checkOnly && changedPaths.length > 0) {
    console.error(
      `Project memory exceeds retention limits: ${changedPaths.join(", ")}. Run npm run memory:trim.`
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  run();
}
