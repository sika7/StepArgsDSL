---
name: stepargs-dsl
description: Breaks down a task into steps and arguments using StepArgs DSL, a lightweight text format that is easier for an LLM to generate reliably than JSON, then parses and validates it deterministically with a bundled CLI to produce structured JSON. Use when a task needs to be turned into structured step/argument data, especially when values contain long text, nested JSON, or code that would be error-prone to emit as JSON directly.
---

# StepArgs DSL

## What this does

1. Generate the task breakdown as StepArgs DSL text, in-context, following the prompt template.
2. Delegate parsing and validation to the bundled CLI (`scripts/cli.js`) — never hand-parse the DSL yourself.
3. The CLI prints a JSON result (`steps` + `validation`) to stdout and a human-readable summary of errors/warnings to stderr.

## Choosing engine + template

- Task/step names may contain Japanese or other non-ASCII characters → `--engine unicode` + [references/prompt-template-ja.md](references/prompt-template-ja.md)
- Task is English-only with ASCII alphanumeric/underscore identifiers → `--engine simple` + [references/prompt-template-en.md](references/prompt-template-en.md)

## Workflow

1. Read the chosen prompt template from `references/` and generate the DSL text in-context, substituting the task description for the template's placeholder.
2. Run the CLI, piping the generated DSL text in via stdin:
   ```bash
   node skill/scripts/cli.js --engine unicode <<'EOF'
   <generated DSL text>
   EOF
   ```
3. Check the exit code:
   - `0` → the JSON on stdout is valid, done.
   - `1` → read the `error:`/`warning:` lines on stderr (each has a line number + message), fix the DSL text, and retry step 2.
4. Always go through the CLI for parsing/validation. Do not write a DSL parser yourself or interpret the syntax by hand.

## CLI flags

- `--engine unicode|simple` (default `unicode`)
- `--no-validate` — skip validation, fast parse only (no `validation` key in the output)
- `--strict` — promote warnings to failures; check `validation.isValid`, not just whether `validation.errors` is non-empty, since strict mode can set `isValid: false` with `errors: []` when only warnings triggered it
- `--limits default|web-ui|strict|none` (default `default`)

## Output shape

```json
{
  "steps": { "StepName": { "argName": "value" } },
  "validation": {
    "isValid": true,
    "errors": [{ "line": 3, "message": "..." }],
    "warnings": [{ "line": 5, "message": "..." }]
  }
}
```

`validation` is omitted entirely when `--no-validate` is passed.

## References

- [DSL syntax spec](references/SPEC.md)
- [Usage examples](references/USAGE_EXAMPLE.md)
- [Japanese prompt template](references/prompt-template-ja.md)
- [English prompt template](references/prompt-template-en.md)
