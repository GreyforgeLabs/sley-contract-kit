import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function schemaInventory(schemaDir) {
  const sourceDir = resolve(schemaDir);
  return readdirSync(sourceDir)
    .filter((file) => file.endsWith(".schema.json"))
    .map((file) => {
      const path = join(sourceDir, file);
      const schema = readJson(path);
      return {
        file,
        path,
        id: schema.$id ?? null,
        title: schema.title ?? null,
        rootSchemaConst: schema.properties?.schema?.const ?? null,
        requiredTopLevelProps: Array.isArray(schema.required) ? [...schema.required] : [],
        hasDefinitions: Boolean(schema.definitions || schema.$defs),
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

export function readFixtureIds(root) {
  const out = new Map();
  const files = fixtureFiles(root);
  for (const path of files) {
    const json = readJson(path);
    const schema = json.schema ?? null;
    out.set(path, schema);
  }
  return out;
}

export function validateRoot(expected, reportPath) {
  const normalized = resolve(reportPath);
  const report = readJson(normalized);
  const actual = report.schema ?? null;
  const hasReportId = Boolean(actual);
  const reasons = [];
  const matches = actual === expected;
  if (!hasReportId) reasons.push("missing schema marker");
  if (!matches) reasons.push(`schema expected ${expected}`);
  return {
    ok: matches,
    expected,
    actual,
    hasReportId,
    path: normalized,
    reasons,
  };
}

export function fixtureFiles(root) {
  const sourceRoot = resolve(root);
  return readdirSync(sourceRoot)
    .filter((file) => file.endsWith(".json"))
    .map((file) => join(sourceRoot, file))
    .filter((path) => statSync(path).isFile())
    .sort();
}

export function checkFixtures(root) {
  const sourceRoot = resolve(root);
  const results = fixtureFiles(root).map((path) => {
    const json = readJson(path);
    const schema = typeof json.schema === "string" ? json.schema : null;
    return {
      path,
      schema,
      status: json.status ?? null,
      ok: schema?.startsWith("sley.") ?? false,
      rootMatches: json.root ?? null,
    };
  });
  return {
    root: sourceRoot,
    schemaPrefix: "sley.",
    ok: results.every((result) => result.ok),
    count: results.length,
    results,
  };
}

export function compareFixtureSets(leftRoot, rightRoot) {
  const left = readFixtureIds(leftRoot);
  const right = readFixtureIds(rightRoot);
  const missing = [];
  const extra = [];
  const drift = [];
  const leftRootResolved = resolve(leftRoot);
  const rightRootResolved = resolve(rightRoot);

  for (const [path, schema] of left.entries()) {
    const rightMirror = path.replace(leftRootResolved, rightRootResolved);
    const leftLabel = path.replace(leftRootResolved, "");
    if (!right.has(rightMirror) && !right.has(path)) {
      missing.push(leftLabel);
      continue;
    }
    const rightPath = right.has(rightMirror) ? rightMirror : path;
    if (right.has(rightPath) && right.get(rightPath) !== schema) {
      drift.push({ file: leftLabel, left: schema, right: right.get(rightPath) });
    }
  }

  for (const rightPath of right.keys()) {
    const leftMirror = rightPath.replace(rightRootResolved, leftRootResolved);
    if (!left.has(leftMirror) && !left.has(rightPath)) {
      extra.push(rightPath.replace(rightRootResolved, ""));
    }
  }

  return {
    left: leftRootResolved,
    right: rightRootResolved,
    drift,
    missing: missing.sort(),
    extra: extra.sort(),
    ok: drift.length === 0 && missing.length === 0 && extra.length === 0,
  };
}
