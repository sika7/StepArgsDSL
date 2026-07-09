import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const cliPath = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "cli.js");

function runCli(args, input) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [cliPath, ...args], {
    input,
    encoding: "utf8",
  });
  return { status, stdout, stderr };
}

test("unicode engine (default) parses valid multi-step DSL", () => {
  const dsl = "--- 記事検索 ---\n記事検索[キーワード:AI技術]\n記事検索[期間:過去3日間]\n";
  const { status, stdout, stderr } = runCli([], dsl);
  const result = JSON.parse(stdout);

  assert.equal(status, 0);
  assert.deepEqual(result.steps["記事検索"], { キーワード: "AI技術", 期間: "過去3日間" });
  assert.equal(result.validation.isValid, true);
  assert.equal(stderr, "");
});

test("simple engine parses valid ASCII-identifier DSL", () => {
  const dsl = "--- Search ---\nSearch[keywords:AI in education]\nSearch[limit:5]\n";
  const { status, stdout } = runCli(["--engine", "simple"], dsl);
  const result = JSON.parse(stdout);

  assert.equal(status, 0);
  assert.deepEqual(result.steps.Search, { keywords: "AI in education", limit: "5" });
  assert.equal(result.validation.isValid, true);
});

test("simple engine cannot recognize non-ASCII identifiers (warning, not error)", () => {
  const dsl = "--- 検索 ---\n検索[キーワード:テスト]\n";
  const { status, stdout, stderr } = runCli(["--engine", "simple"], dsl);
  const result = JSON.parse(stdout);

  assert.equal(status, 0);
  assert.deepEqual(result.steps, {});
  assert.equal(result.validation.isValid, true);
  assert.equal(result.validation.warnings.length, 2);
  assert.match(stderr, /warning: line 1:/);
});

test("unterminated heredoc fails validation with exit code 1", () => {
  const dsl = "--- Report ---\nReport[content:<<<\nno closing marker\n";
  const { status, stdout, stderr } = runCli(["--engine", "unicode"], dsl);
  const result = JSON.parse(stdout);

  assert.equal(status, 1);
  assert.equal(result.validation.isValid, false);
  assert.equal(result.validation.errors[0].type, "UNTERMINATED_HEREDOC");
  assert.match(stderr, /error: line 2:/);
});

test("--no-validate omits the validation key entirely", () => {
  const dsl = "--- Search ---\nSearch[keywords:AI]\n";
  const { status, stdout } = runCli(["--engine", "simple", "--no-validate"], dsl);
  const result = JSON.parse(stdout);

  assert.equal(status, 0);
  assert.deepEqual(result.steps.Search, { keywords: "AI" });
  assert.equal("validation" in result, false);
});

test("--strict promotes warnings to failure even when errors stays empty", () => {
  const dsl = "--- 検索 ---\n検索[キーワード:テスト]\n";

  const lenient = runCli(["--engine", "simple"], dsl);
  assert.equal(lenient.status, 0);

  const strict = runCli(["--engine", "simple", "--strict"], dsl);
  const strictResult = JSON.parse(strict.stdout);

  assert.equal(strict.status, 1);
  assert.equal(strictResult.validation.isValid, false);
  assert.deepEqual(strictResult.validation.errors, []);
  assert.ok(strictResult.validation.warnings.length > 0);
});

test("--limits selects a length-limit preset without changing valid output", () => {
  const dsl = "--- Search ---\nSearch[keywords:AI]\n";
  const { status, stdout } = runCli(["--engine", "simple", "--limits", "web-ui"], dsl);
  const result = JSON.parse(stdout);

  assert.equal(status, 0);
  assert.equal(result.validation.isValid, true);
});

test("invalid --engine value exits 1 with a clean error message", () => {
  const { status, stdout, stderr } = runCli(["--engine", "bogus"], "x");

  assert.equal(status, 1);
  assert.equal(stdout, "");
  assert.match(stderr, /Invalid --engine value: bogus/);
});
