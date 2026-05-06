#!/usr/bin/env node
import { checkFixtures, schemaInventory, validateRoot } from "./index.mjs";

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

const [command, ...args] = process.argv.slice(2);
if (!command || command === "--help" || command === "help") {
  console.log("usage: sley-contract <inventory|validate|check-fixtures> ...");
  process.exit(0);
}

if (command === "inventory") {
  print({ schema: "sley.contract.inventory.v0", schemas: schemaInventory(args[0] ?? "docs/schemas") });
} else if (command === "validate") {
  const schemaIndex = args.indexOf("--schema");
  const expected = schemaIndex >= 0 ? args[schemaIndex + 1] : null;
  const reportPath = args.find((arg, index) => index !== schemaIndex && index !== schemaIndex + 1 && !arg.startsWith("--"));
  if (!expected || !reportPath) {
    throw new Error("validate requires --schema <schema-id> <report.json>");
  }
  const result = validateRoot(expected, reportPath);
  print({ schema: "sley.contract.validation.v0", ...result });
  process.exit(result.ok ? 0 : 1);
} else if (command === "check-fixtures") {
  const result = checkFixtures(args[0] ?? "fixtures/contracts");
  print({ schema: "sley.contract.fixture_check.v0", ...result });
  process.exit(result.ok ? 0 : 1);
} else {
  throw new Error(`unknown command ${command}`);
}
