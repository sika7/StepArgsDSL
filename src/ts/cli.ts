#!/usr/bin/env node
import * as unicodeEngine from "./index";
import type { FullParseResult, LengthLimits, ParseOptions } from "./index";

type EngineName = "unicode" | "simple";
type LimitsName = "default" | "web-ui" | "strict" | "none";

interface CliOptions {
  engine: EngineName;
  validate: boolean;
  strict: boolean;
  limits: LimitsName;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    engine: "unicode",
    validate: true,
    strict: false,
    limits: "default",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--engine": {
        const value = argv[++i];
        if (value !== "unicode" && value !== "simple") {
          throw new Error(`Invalid --engine value: ${String(value)} (expected "unicode" or "simple")`);
        }
        options.engine = value;
        break;
      }
      case "--no-validate":
        options.validate = false;
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--limits": {
        const value = argv[++i];
        if (value !== "default" && value !== "web-ui" && value !== "strict" && value !== "none") {
          throw new Error(`Invalid --limits value: ${String(value)} (expected "default", "web-ui", "strict", or "none")`);
        }
        options.limits = value;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolveLimits(name: LimitsName): LengthLimits | undefined {
  switch (name) {
    case "default":
      return unicodeEngine.DEFAULT_LIMITS;
    case "web-ui":
      return unicodeEngine.WEB_UI_LIMITS;
    case "strict":
      return unicodeEngine.STRICT_LIMITS;
    case "none":
      return undefined;
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const input = await readStdin();
  const engine = options.engine === "simple" ? unicodeEngine.simple : unicodeEngine;

  const parseOptions: ParseOptions = {
    validate: options.validate,
    strict: options.strict,
    limits: resolveLimits(options.limits),
  };

  const result: FullParseResult = engine.parseStepArgsScript(input, parseOptions);

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");

  const validation = result.validation;
  if (validation) {
    for (const warning of validation.warnings) {
      process.stderr.write(`warning: line ${warning.line}: ${warning.message}\n`);
    }
    for (const error of validation.errors) {
      process.stderr.write(`error: line ${error.line}: ${error.message}\n`);
    }
    if (!validation.isValid) {
      process.exitCode = 1;
    }
  }
}

main().catch(err => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
