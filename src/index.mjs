import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function schemaInventory(schemaDir) {
  return readdirSync(schemaDir)
    .filter((file) => file.endsWith(".schema.json"))
    .map((file) => {
      const path = join(schemaDir, file);
      const schema = readJson(path);
      return {
        file,
        path,
        id: schema.$id ?? null,
        title: schema.title ?? null,
        rootSchemaConst: schema.properties?.schema?.const ?? null,
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

export function validateRoot(expected, reportPath) {
  const report = readJson(reportPath);
  if (report.schema !== expected) {
    return {
      ok: false,
      expected,
      actual: report.schema ?? null,
      path: reportPath,
    };
  }
  return { ok: true, expected, actual: report.schema, path: reportPath };
}

export function fixtureFiles(root) {
  return readdirSync(root)
    .filter((file) => file.endsWith(".json"))
    .map((file) => join(root, file))
    .filter((path) => statSync(path).isFile())
    .sort();
}

export function checkFixtures(root) {
  const results = fixtureFiles(root).map((path) => {
    const json = readJson(path);
    return {
      path,
      schema: json.schema ?? null,
      ok: typeof json.schema === "string" && json.schema.startsWith("sley."),
    };
  });
  return {
    ok: results.every((result) => result.ok),
    count: results.length,
    results,
  };
}
