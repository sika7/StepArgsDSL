#!/usr/bin/env node
import { copyFileSync, mkdirSync, chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(scriptDir);

const referencesDir = join(rootDir, "skill", "references");
const scriptsDir = join(rootDir, "skill", "scripts");

mkdirSync(referencesDir, { recursive: true });
mkdirSync(scriptsDir, { recursive: true });

const referenceFiles = [
  ["docs/SPEC.md", "SPEC.md"],
  ["docs/USAGE_EXAMPLE.md", "USAGE_EXAMPLE.md"],
  ["prompt-template-ja.md", "prompt-template-ja.md"],
  ["prompt-template-en.md", "prompt-template-en.md"],
];

for (const [src, dest] of referenceFiles) {
  copyFileSync(join(rootDir, src), join(referencesDir, dest));
}

const cliDest = join(scriptsDir, "cli.js");
copyFileSync(join(rootDir, "dist", "cli.js"), cliDest);
chmodSync(cliDest, 0o755);

console.log("skill/ build artifacts updated.");
