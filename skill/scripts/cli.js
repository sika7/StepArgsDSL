#!/usr/bin/env node
"use strict";
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/ts/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_LIMITS: () => DEFAULT_LIMITS,
  STRICT_LIMITS: () => STRICT_LIMITS,
  WEB_UI_LIMITS: () => WEB_UI_LIMITS,
  escapeValue: () => escapeValue,
  parseStepArgsScript: () => parseStepArgsScript,
  parseSteps: () => parseSteps,
  simple: () => simple_exports,
  unescapeValue: () => unescapeValue,
  validateStepArgsScript: () => validateStepArgsScript
});

// src/ts/unicode.ts
function unescapeValue(value) {
  return value.replace(/\\(.)/g, (match, char) => {
    switch (char) {
      case "[":
        return "[";
      case "]":
        return "]";
      case ":":
        return ":";
      case "<":
        return "<";
      case ">":
        return ">";
      case "\\":
        return "\\";
      default:
        throw new Error(`Invalid escape sequence: \\${char}`);
    }
  });
}
function escapeValue(value) {
  return value.replace(/[\[\]::<>\\]/g, "\\$&");
}
function parseSteps(input) {
  const result = {};
  let currentStep = "";
  let i = 0;
  const lines = input.split("\n");
  while (i < lines.length) {
    const line = lines[i].trim();
    const stepMatch = line.match(/^---\s*([\p{L}\p{N}_\-\s]+?)\s*---$/u);
    if (stepMatch) {
      currentStep = stepMatch[1];
      result[currentStep] = {};
      i++;
      continue;
    }
    const singleArgMatch = line.match(/^([\p{L}\p{N}_\-]+)\[([\p{L}\p{N}_]+):((?:[^<\]]|\\.)*?)\]$/u);
    if (singleArgMatch) {
      const [, stepName, argName, value] = singleArgMatch;
      if (stepName === currentStep) {
        try {
          result[currentStep][argName.trim()] = unescapeValue(value.trim());
        } catch (error) {
          result[currentStep][argName.trim()] = value.trim();
        }
      }
      i++;
      continue;
    }
    const heredocMatch = line.match(/^([\p{L}\p{N}_\-]+)\[([\p{L}\p{N}_]+):<<<\s*$/u);
    if (heredocMatch) {
      const [, stepName, argName] = heredocMatch;
      if (stepName === currentStep) {
        i++;
        let content = "";
        while (i < lines.length && lines[i].trim() !== ">>>]") {
          content += lines[i] + "\n";
          i++;
        }
        result[currentStep][argName.trim()] = content.replace(/\n$/, "");
      }
      i++;
      continue;
    }
    i++;
  }
  return result;
}
function validateStepArgsScript(input, limits) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  const lines = input.split("\n");
  let currentStep = "";
  let inHeredoc = false;
  let heredocStartLine = -1;
  let heredocInfo = { stepName: "", argName: "" };
  let heredocContent = "";
  const encounteredSteps = /* @__PURE__ */ new Set();
  const stepArguments = /* @__PURE__ */ new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    if (line === "" || line.startsWith("#")) continue;
    if (inHeredoc) {
      if (line === ">>>]") {
        inHeredoc = false;
        if (limits?.argValueMulti && heredocContent.length > limits.argValueMulti) {
          result.warnings.push({
            type: "ARG_VALUE_TOO_LONG",
            line: heredocStartLine,
            message: `\u8907\u6570\u884C\u5F15\u6570\u5024\u304C\u9577\u3059\u304E\u307E\u3059: ${heredocContent.length}\u6587\u5B57 (\u5236\u9650: ${limits.argValueMulti}\u6587\u5B57)`,
            stepName: heredocInfo.stepName,
            argName: heredocInfo.argName
          });
        }
        heredocContent = "";
        continue;
      }
      heredocContent += line + "\n";
      if (line.match(/^---\s*(.+?)\s*---$/)) {
        result.errors.push({
          type: "STEP_BOUNDARY_VIOLATION",
          line: lineNum,
          message: `\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u5185\u3067\u30B9\u30C6\u30C3\u30D7\u304C\u958B\u59CB\u3055\u308C\u307E\u3057\u305F\uFF08${heredocStartLine}\u884C\u76EE\u304B\u3089\u958B\u59CB\uFF09`,
          stepName: heredocInfo.stepName,
          argName: heredocInfo.argName
        });
      }
      if (line.includes("<<<")) {
        result.errors.push({
          type: "NESTED_HEREDOC",
          line: lineNum,
          message: "\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u30CD\u30B9\u30C8\u306F\u7981\u6B62\u3055\u308C\u3066\u3044\u307E\u3059",
          stepName: heredocInfo.stepName,
          argName: heredocInfo.argName
        });
      }
      continue;
    }
    const stepMatch = line.match(/^---\s*([\p{L}\p{N}_\-\s]+?)\s*---$/u);
    if (stepMatch) {
      const stepName = stepMatch[1];
      if (limits?.stepName && stepName.length > limits.stepName) {
        result.warnings.push({
          type: "STEP_NAME_TOO_LONG",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7\u540D\u304C\u9577\u3059\u304E\u307E\u3059: ${stepName.length}\u6587\u5B57 (\u5236\u9650: ${limits.stepName}\u6587\u5B57)`,
          stepName
        });
      }
      if (encounteredSteps.has(stepName)) {
        result.warnings.push({
          type: "DUPLICATE_STEP",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7 "${stepName}" \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`,
          stepName
        });
      }
      currentStep = stepName;
      encounteredSteps.add(stepName);
      stepArguments.set(stepName, /* @__PURE__ */ new Set());
      continue;
    }
    if (line.match(/^([\p{L}\p{N}_\-]+)\[/u) && currentStep === "") {
      result.errors.push({
        type: "ORPHANED_ARGUMENT",
        line: lineNum,
        message: "\u30B9\u30C6\u30C3\u30D7\u30D6\u30ED\u30C3\u30AF\u5916\u306B\u5F15\u6570\u884C\u304C\u3042\u308A\u307E\u3059"
      });
      continue;
    }
    const singleArgMatch = line.match(/^([\p{L}\p{N}_\-]+)\[([\p{L}\p{N}_]+):((?:[^<\]]|\\.)*?)\]$/u);
    if (singleArgMatch) {
      const [, stepName, argName, value] = singleArgMatch;
      if (limits?.argName && argName.length > limits.argName) {
        result.warnings.push({
          type: "ARG_NAME_TOO_LONG",
          line: lineNum,
          message: `\u5F15\u6570\u540D\u304C\u9577\u3059\u304E\u307E\u3059: ${argName.length}\u6587\u5B57 (\u5236\u9650: ${limits.argName}\u6587\u5B57)`,
          stepName,
          argName
        });
      }
      if (limits?.argValueSingle && value.length > limits.argValueSingle) {
        result.warnings.push({
          type: "ARG_VALUE_TOO_LONG",
          line: lineNum,
          message: `\u5358\u884C\u5F15\u6570\u5024\u304C\u9577\u3059\u304E\u307E\u3059: ${value.length}\u6587\u5B57 (\u5236\u9650: ${limits.argValueSingle}\u6587\u5B57)`,
          stepName,
          argName
        });
      }
      if (stepName !== currentStep) {
        result.warnings.push({
          type: "STEP_NAME_MISMATCH",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7\u540D\u304C\u4E0D\u4E00\u81F4\u3067\u3059\u3002\u671F\u5F85\u5024: "${currentStep}", \u5B9F\u969B: "${stepName}"`,
          stepName,
          argName
        });
      }
      const args = stepArguments.get(currentStep);
      if (args && args.has(argName)) {
        result.warnings.push({
          type: "DUPLICATE_ARGUMENT",
          line: lineNum,
          message: `\u5F15\u6570 "${argName}" \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`,
          stepName: currentStep,
          argName
        });
      } else if (args) {
        args.add(argName);
      }
      try {
        unescapeValue(value);
      } catch (error) {
        result.errors.push({
          type: "INVALID_ESCAPE_SEQUENCE",
          line: lineNum,
          message: error instanceof Error ? error.message : "\u7121\u52B9\u306A\u30A8\u30B9\u30B1\u30FC\u30D7\u30B7\u30FC\u30B1\u30F3\u30B9",
          stepName: currentStep,
          argName
        });
      }
      if (value.endsWith("\\")) {
        result.errors.push({
          type: "UNTERMINATED_ESCAPE",
          line: lineNum,
          message: "\u884C\u672B\u3067\u30A8\u30B9\u30B1\u30FC\u30D7\u6587\u5B57\u304C\u672A\u5B8C\u4E86\u3067\u3059",
          stepName: currentStep,
          argName
        });
      }
      continue;
    }
    const heredocMatch = line.match(/^([\p{L}\p{N}_\-]+)\[([\p{L}\p{N}_]+):<<<(.*)$/u);
    if (heredocMatch) {
      const [, stepName, argName, extra] = heredocMatch;
      if (limits?.argName && argName.length > limits.argName) {
        result.warnings.push({
          type: "ARG_NAME_TOO_LONG",
          line: lineNum,
          message: `\u5F15\u6570\u540D\u304C\u9577\u3059\u304E\u307E\u3059: ${argName.length}\u6587\u5B57 (\u5236\u9650: ${limits.argName}\u6587\u5B57)`,
          stepName,
          argName
        });
      }
      if (stepName !== currentStep) {
        result.warnings.push({
          type: "STEP_NAME_MISMATCH",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7\u540D\u304C\u4E0D\u4E00\u81F4\u3067\u3059\u3002\u671F\u5F85\u5024: "${currentStep}", \u5B9F\u969B: "${stepName}"`,
          stepName,
          argName
        });
      }
      const args = stepArguments.get(currentStep);
      if (args && args.has(argName)) {
        result.warnings.push({
          type: "DUPLICATE_ARGUMENT",
          line: lineNum,
          message: `\u5F15\u6570 "${argName}" \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`,
          stepName: currentStep,
          argName
        });
      } else if (args) {
        args.add(argName);
      }
      if (extra.trim() !== "") {
        result.warnings.push({
          type: "INVALID_HEREDOC_START",
          line: lineNum,
          message: `\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u958B\u59CB\u30DE\u30FC\u30AB\u30FC\u5F8C\u306B\u4F59\u8A08\u306A\u6587\u5B57\u304C\u3042\u308A\u307E\u3059: "${extra.trim()}"`,
          stepName,
          argName
        });
      }
      inHeredoc = true;
      heredocStartLine = lineNum;
      heredocInfo = { stepName, argName };
      heredocContent = "";
      continue;
    }
    if (line !== "") {
      result.warnings.push({
        type: "UNRECOGNIZED_SYNTAX",
        line: lineNum,
        message: `\u8A8D\u8B58\u3067\u304D\u306A\u3044\u69CB\u6587\u3067\u3059: "${line}"`
      });
    }
  }
  if (inHeredoc) {
    result.errors.push({
      type: "UNTERMINATED_HEREDOC",
      line: heredocStartLine,
      message: `\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u304C\u7D42\u4E86\u3055\u308C\u3066\u3044\u307E\u305B\u3093\uFF08${heredocStartLine}\u884C\u76EE\u304B\u3089\u958B\u59CB\uFF09`,
      stepName: heredocInfo.stepName,
      argName: heredocInfo.argName
    });
  }
  for (const [stepName, args] of stepArguments.entries()) {
    if (args.size === 0) {
      result.warnings.push({
        type: "EMPTY_STEP_BLOCK",
        line: 0,
        // 行番号は不明
        message: `\u30B9\u30C6\u30C3\u30D7 "${stepName}" \u306B\u5F15\u6570\u304C\u3042\u308A\u307E\u305B\u3093`,
        stepName
      });
    }
  }
  result.isValid = result.errors.length === 0;
  return result;
}
function parseStepArgsScript(input, options = {}) {
  const result = {
    steps: {}
  };
  if (options.validate) {
    result.validation = validateStepArgsScript(input, options.limits);
    if (!result.validation.isValid) {
      if (options.strict) {
        return result;
      }
    }
    if (options.strict && result.validation.warnings.length > 0) {
      result.validation.isValid = false;
      return result;
    }
  }
  result.steps = parseSteps(input);
  return result;
}
var DEFAULT_LIMITS = {
  stepName: 128,
  argName: 64,
  argValueSingle: 16384,
  argValueMulti: 1048576
};
var WEB_UI_LIMITS = {
  stepName: 200,
  argName: 100,
  argValueSingle: 5e4,
  argValueMulti: 5e5
};
var STRICT_LIMITS = {
  stepName: 64,
  argName: 32,
  argValueSingle: 4096,
  argValueMulti: 262144
};

// src/ts/simple.ts
var simple_exports = {};
__export(simple_exports, {
  DEFAULT_LIMITS: () => DEFAULT_LIMITS2,
  STRICT_LIMITS: () => STRICT_LIMITS2,
  WEB_UI_LIMITS: () => WEB_UI_LIMITS2,
  escapeValue: () => escapeValue2,
  parseStepArgsScript: () => parseStepArgsScript2,
  parseSteps: () => parseSteps2,
  unescapeValue: () => unescapeValue2,
  validateStepArgsScript: () => validateStepArgsScript2
});
function unescapeValue2(value) {
  return value.replace(/\\(.)/g, (match, char) => {
    switch (char) {
      case "[":
        return "[";
      case "]":
        return "]";
      case ":":
        return ":";
      case "<":
        return "<";
      case ">":
        return ">";
      case "\\":
        return "\\";
      default:
        throw new Error(`Invalid escape sequence: \\${char}`);
    }
  });
}
function escapeValue2(value) {
  return value.replace(/[\[\]::<>\\]/g, "\\$&");
}
function parseSteps2(input) {
  const result = {};
  let currentStep = "";
  let i = 0;
  const lines = input.split("\n");
  while (i < lines.length) {
    const line = lines[i].trim();
    const stepMatch = line.match(/^---\s*([A-Za-z0-9_]+)\s*---$/);
    if (stepMatch) {
      currentStep = stepMatch[1];
      result[currentStep] = {};
      i++;
      continue;
    }
    const singleArgMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):(.*?)\]$/);
    if (singleArgMatch) {
      const [, stepName, argName, value] = singleArgMatch;
      if (stepName === currentStep) {
        try {
          result[currentStep][argName.trim()] = unescapeValue2(value.trim());
        } catch (error) {
          result[currentStep][argName.trim()] = value.trim();
        }
      }
      i++;
      continue;
    }
    const heredocMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):<<<\s*$/);
    if (heredocMatch) {
      const [, stepName, argName] = heredocMatch;
      if (stepName === currentStep) {
        i++;
        let content = "";
        while (i < lines.length && lines[i].trim() !== ">>>]") {
          content += lines[i] + "\n";
          i++;
        }
        result[currentStep][argName.trim()] = content.replace(/\n$/, "");
      }
      i++;
      continue;
    }
    i++;
  }
  return result;
}
function validateStepArgsScript2(input, limits) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  const lines = input.split("\n");
  let currentStep = "";
  let inHeredoc = false;
  let heredocStartLine = -1;
  let heredocInfo = { stepName: "", argName: "" };
  let heredocContent = "";
  const encounteredSteps = /* @__PURE__ */ new Set();
  const stepArguments = /* @__PURE__ */ new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    if (line === "" || line.startsWith("#")) continue;
    if (inHeredoc) {
      if (line === ">>>]") {
        inHeredoc = false;
        if (limits?.argValueMulti && heredocContent.length > limits.argValueMulti) {
          result.warnings.push({
            type: "ARG_VALUE_TOO_LONG",
            line: heredocStartLine,
            message: `\u8907\u6570\u884C\u5F15\u6570\u5024\u304C\u9577\u3059\u304E\u307E\u3059: ${heredocContent.length}\u6587\u5B57 (\u5236\u9650: ${limits.argValueMulti}\u6587\u5B57)`,
            stepName: heredocInfo.stepName,
            argName: heredocInfo.argName
          });
        }
        heredocContent = "";
        continue;
      }
      heredocContent += line + "\n";
      if (line.match(/^---\s*(.+?)\s*---$/)) {
        result.errors.push({
          type: "STEP_BOUNDARY_VIOLATION",
          line: lineNum,
          message: `\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u5185\u3067\u30B9\u30C6\u30C3\u30D7\u304C\u958B\u59CB\u3055\u308C\u307E\u3057\u305F\uFF08${heredocStartLine}\u884C\u76EE\u304B\u3089\u958B\u59CB\uFF09`,
          stepName: heredocInfo.stepName,
          argName: heredocInfo.argName
        });
      }
      if (line.includes("<<<")) {
        result.errors.push({
          type: "NESTED_HEREDOC",
          line: lineNum,
          message: "\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u30CD\u30B9\u30C8\u306F\u7981\u6B62\u3055\u308C\u3066\u3044\u307E\u3059",
          stepName: heredocInfo.stepName,
          argName: heredocInfo.argName
        });
      }
      continue;
    }
    const stepMatch = line.match(/^---\s*([A-Za-z0-9_]+)\s*---$/);
    if (stepMatch) {
      const stepName = stepMatch[1];
      if (limits?.stepName && stepName.length > limits.stepName) {
        result.warnings.push({
          type: "STEP_NAME_TOO_LONG",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7\u540D\u304C\u9577\u3059\u304E\u307E\u3059: ${stepName.length}\u6587\u5B57 (\u5236\u9650: ${limits.stepName}\u6587\u5B57)`,
          stepName
        });
      }
      if (encounteredSteps.has(stepName)) {
        result.warnings.push({
          type: "DUPLICATE_STEP",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7 "${stepName}" \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`,
          stepName
        });
      }
      currentStep = stepName;
      encounteredSteps.add(stepName);
      stepArguments.set(stepName, /* @__PURE__ */ new Set());
      continue;
    }
    if (line.match(/^([A-Za-z0-9_]+)\[/) && currentStep === "") {
      result.errors.push({
        type: "ORPHANED_ARGUMENT",
        line: lineNum,
        message: "\u30B9\u30C6\u30C3\u30D7\u30D6\u30ED\u30C3\u30AF\u5916\u306B\u5F15\u6570\u884C\u304C\u3042\u308A\u307E\u3059"
      });
      continue;
    }
    const singleArgMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):(.*?)\]$/);
    if (singleArgMatch) {
      const [, stepName, argName, value] = singleArgMatch;
      if (limits?.argName && argName.length > limits.argName) {
        result.warnings.push({
          type: "ARG_NAME_TOO_LONG",
          line: lineNum,
          message: `\u5F15\u6570\u540D\u304C\u9577\u3059\u304E\u307E\u3059: ${argName.length}\u6587\u5B57 (\u5236\u9650: ${limits.argName}\u6587\u5B57)`,
          stepName,
          argName
        });
      }
      if (limits?.argValueSingle && value.length > limits.argValueSingle) {
        result.warnings.push({
          type: "ARG_VALUE_TOO_LONG",
          line: lineNum,
          message: `\u5358\u884C\u5F15\u6570\u5024\u304C\u9577\u3059\u304E\u307E\u3059: ${value.length}\u6587\u5B57 (\u5236\u9650: ${limits.argValueSingle}\u6587\u5B57)`,
          stepName,
          argName
        });
      }
      if (stepName !== currentStep) {
        result.warnings.push({
          type: "STEP_NAME_MISMATCH",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7\u540D\u304C\u4E0D\u4E00\u81F4\u3067\u3059\u3002\u671F\u5F85\u5024: "${currentStep}", \u5B9F\u969B: "${stepName}"`,
          stepName,
          argName
        });
      }
      const args = stepArguments.get(currentStep);
      if (args && args.has(argName)) {
        result.warnings.push({
          type: "DUPLICATE_ARGUMENT",
          line: lineNum,
          message: `\u5F15\u6570 "${argName}" \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`,
          stepName: currentStep,
          argName
        });
      } else if (args) {
        args.add(argName);
      }
      try {
        unescapeValue2(value);
      } catch (error) {
        result.errors.push({
          type: "INVALID_ESCAPE_SEQUENCE",
          line: lineNum,
          message: error instanceof Error ? error.message : "\u7121\u52B9\u306A\u30A8\u30B9\u30B1\u30FC\u30D7\u30B7\u30FC\u30B1\u30F3\u30B9",
          stepName: currentStep,
          argName
        });
      }
      if (value.endsWith("\\")) {
        result.errors.push({
          type: "UNTERMINATED_ESCAPE",
          line: lineNum,
          message: "\u884C\u672B\u3067\u30A8\u30B9\u30B1\u30FC\u30D7\u6587\u5B57\u304C\u672A\u5B8C\u4E86\u3067\u3059",
          stepName: currentStep,
          argName
        });
      }
      continue;
    }
    const heredocMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):<<<(.*)$/);
    if (heredocMatch) {
      const [, stepName, argName, extra] = heredocMatch;
      if (limits?.argName && argName.length > limits.argName) {
        result.warnings.push({
          type: "ARG_NAME_TOO_LONG",
          line: lineNum,
          message: `\u5F15\u6570\u540D\u304C\u9577\u3059\u304E\u307E\u3059: ${argName.length}\u6587\u5B57 (\u5236\u9650: ${limits.argName}\u6587\u5B57)`,
          stepName,
          argName
        });
      }
      if (stepName !== currentStep) {
        result.warnings.push({
          type: "STEP_NAME_MISMATCH",
          line: lineNum,
          message: `\u30B9\u30C6\u30C3\u30D7\u540D\u304C\u4E0D\u4E00\u81F4\u3067\u3059\u3002\u671F\u5F85\u5024: "${currentStep}", \u5B9F\u969B: "${stepName}"`,
          stepName,
          argName
        });
      }
      const args = stepArguments.get(currentStep);
      if (args && args.has(argName)) {
        result.warnings.push({
          type: "DUPLICATE_ARGUMENT",
          line: lineNum,
          message: `\u5F15\u6570 "${argName}" \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`,
          stepName: currentStep,
          argName
        });
      } else if (args) {
        args.add(argName);
      }
      if (extra.trim() !== "") {
        result.warnings.push({
          type: "INVALID_HEREDOC_START",
          line: lineNum,
          message: `\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u958B\u59CB\u30DE\u30FC\u30AB\u30FC\u5F8C\u306B\u4F59\u8A08\u306A\u6587\u5B57\u304C\u3042\u308A\u307E\u3059: "${extra.trim()}"`,
          stepName,
          argName
        });
      }
      inHeredoc = true;
      heredocStartLine = lineNum;
      heredocInfo = { stepName, argName };
      heredocContent = "";
      continue;
    }
    if (line !== "") {
      result.warnings.push({
        type: "UNRECOGNIZED_SYNTAX",
        line: lineNum,
        message: `\u8A8D\u8B58\u3067\u304D\u306A\u3044\u69CB\u6587\u3067\u3059: "${line}"`
      });
    }
  }
  if (inHeredoc) {
    result.errors.push({
      type: "UNTERMINATED_HEREDOC",
      line: heredocStartLine,
      message: `\u30D2\u30A2\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u304C\u7D42\u4E86\u3055\u308C\u3066\u3044\u307E\u305B\u3093\uFF08${heredocStartLine}\u884C\u76EE\u304B\u3089\u958B\u59CB\uFF09`,
      stepName: heredocInfo.stepName,
      argName: heredocInfo.argName
    });
  }
  for (const [stepName, args] of stepArguments.entries()) {
    if (args.size === 0) {
      result.warnings.push({
        type: "EMPTY_STEP_BLOCK",
        line: 0,
        // 行番号は不明
        message: `\u30B9\u30C6\u30C3\u30D7 "${stepName}" \u306B\u5F15\u6570\u304C\u3042\u308A\u307E\u305B\u3093`,
        stepName
      });
    }
  }
  result.isValid = result.errors.length === 0;
  return result;
}
function parseStepArgsScript2(input, options = {}) {
  const result = {
    steps: {}
  };
  if (options.validate) {
    result.validation = validateStepArgsScript2(input, options.limits);
    if (!result.validation.isValid) {
      if (options.strict) {
        return result;
      }
    }
    if (options.strict && result.validation.warnings.length > 0) {
      result.validation.isValid = false;
      return result;
    }
  }
  result.steps = parseSteps2(input);
  return result;
}
var DEFAULT_LIMITS2 = {
  stepName: 128,
  argName: 64,
  argValueSingle: 16384,
  argValueMulti: 1048576
};
var WEB_UI_LIMITS2 = {
  stepName: 200,
  argName: 100,
  argValueSingle: 5e4,
  argValueMulti: 5e5
};
var STRICT_LIMITS2 = {
  stepName: 64,
  argName: 32,
  argValueSingle: 4096,
  argValueMulti: 262144
};

// src/ts/cli.ts
function parseArgs(argv) {
  const options = {
    engine: "unicode",
    validate: true,
    strict: false,
    limits: "default"
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
function resolveLimits(name) {
  switch (name) {
    case "default":
      return DEFAULT_LIMITS;
    case "web-ui":
      return WEB_UI_LIMITS;
    case "strict":
      return STRICT_LIMITS;
    case "none":
      return void 0;
  }
}
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const input = await readStdin();
  const engine = options.engine === "simple" ? simple_exports : index_exports;
  const parseOptions = {
    validate: options.validate,
    strict: options.strict,
    limits: resolveLimits(options.limits)
  };
  const result = engine.parseStepArgsScript(input, parseOptions);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  const validation = result.validation;
  if (validation) {
    for (const warning of validation.warnings) {
      process.stderr.write(`warning: line ${warning.line}: ${warning.message}
`);
    }
    for (const error of validation.errors) {
      process.stderr.write(`error: line ${error.line}: ${error.message}
`);
    }
    if (!validation.isValid) {
      process.exitCode = 1;
    }
  }
}
main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}
`);
  process.exitCode = 1;
});
