import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

mkdirSync("tmp", { recursive: true });
writeFileSync("tmp/report.json", JSON.stringify({ schema: "sley.verify.report.v0", status: "passed" }));
const out = execFileSync("node", ["src/cli.mjs", "validate", "--schema", "sley.verify.report.v0", "tmp/report.json"], { encoding: "utf8" });
const parsed = JSON.parse(out);
if (!parsed.ok) throw new Error("expected validation to pass");
console.log("contract-kit smoke ok");
