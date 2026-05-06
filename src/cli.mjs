#!/usr/bin/env node
import { checkFixtures, schemaInventory, validateRoot } from "./index.mjs";
import { compareFixtureSets } from "./index.mjs";

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.log("usage: sley-contract <inventory|validate|check-fixtures|compare|help> ...");
  console.log("  inventory <schemaDir> --json");
  console.log("  validate --schema <schema-id> <report.json>");
  console.log("  check-fixtures <fixtureDir>");
  console.log("  compare <left-fixtures> <right-fixtures>");
}

function fail(message, code = 1) {
  throw Object.assign(new Error(message), { code });
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const command = args[0];
const positional = [];

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--schema") {
    i += 1;
    continue;
  }
  if (arg.startsWith("--")) {
    continue;
  }
  positional.push(arg);
}

if (!command || flags.has("--help") || command === "help") {
  usage();
  process.exit(0);
}

if (command === "inventory") {
  const schemaDir = positional[0] ?? "docs/schemas";
  const schemas = schemaInventory(schemaDir);
  if (flags.has("--json")) {
    print({ schema: "sley.contract.inventory.v0", schemas });
  } else {
    console.log(`schemas: ${schemas.length}`);
    for (const schema of schemas) {
      console.log(`${schema.file}: ${schema.id ?? "(no id)"}`);
    }
  }
} else if (command === "validate") {
  const schemaIndex = args.findIndex((arg) => arg === "--schema");
  const expected = schemaIndex >= 0 ? args[schemaIndex + 1] : null;
  const reportPath = positional[0] ?? null;
  if (!expected || !reportPath) {
    fail("validate requires --schema <schema-id> <report.json>");
  }
  const result = validateRoot(expected, reportPath);
  if (flags.has("--json")) {
    print({ schema: "sley.contract.validation.v0", ...result });
  } else {
    console.log(`ok=${result.ok} schema=${result.expected} actual=${result.actual ?? "(none)"}`);
  }
  process.exit(result.ok ? 0 : 1);
} else if (command === "check-fixtures") {
  const result = checkFixtures(positional[0] ?? "fixtures/contracts");
  if (flags.has("--json")) {
    print({ schema: "sley.contract.fixture_check.v0", ...result });
  } else {
    console.log(`fixtures: ${result.count} ok=${result.ok}`);
  }
  process.exit(result.ok ? 0 : 1);
} else if (command === "compare") {
  const left = positional[0] ?? null;
  const right = positional[1] ?? null;
  if (!left || !right) {
    fail("compare requires <left-fixtures> <right-fixtures>");
  }
  const result = compareFixtureSets(left, right);
  print({ schema: "sley.contract.fixture_compare.v0", ...result });
  process.exit(result.ok ? 0 : 1);
} else {
  fail(`unknown command ${command}`);
}
