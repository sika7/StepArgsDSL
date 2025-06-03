# 🧩 StepArgs DSL

**StepArgs DSL** (StepArgs Domain-Specific Language) is a lightweight, human-friendly DSL for defining task steps and arguments in a clean, structured format. It’s designed for use with LLMs, autonomous agents, prompt templates, and script orchestration.

Instead of relying on verbose or fragile JSON, StepArgs DSL offers a visually intuitive, line-based syntax that's easy to parse with regular expressions and readable for humans.

## ✨ Features

- ✅ **Simple syntax** using step blocks and key-value pairs
- ✅ **LLM-friendly**: easier to generate and parse than JSON
- ✅ **Regex-compatible**: ideal for fast prototyping
- ✅ **Structured execution**: suitable for function calls, workflows, and tool chains
- ✅ **Human-readable**: excellent for non-technical users and documentation

## 🔧 Syntax Overview

### 🧱 Step Block

Each task or function call is wrapped with `--- StepName ---`.

### 🔢 Arguments

Arguments are written in the format:

StepName[argumentName:argumentValue]

### ✅ Example

— Translate —
Translate[sourceLanguage:Japanese]
Translate[targetLanguage:English]
Translate[text:こんにちは、世界]

— Summarize —
Summarize[maxLength:100]

## 📘 Grammar (Regex)

| Component     | Regex Pattern                                              |
| ------------- | ---------------------------------------------------------- |
| Step Header   | `^---\s*(.+?)\s*---$`                                      |
| Argument Line | `^(\S+)$begin:math:display$(.+?):(.+?)$end:math:display$$` |

## 🧪 Sample Use Cases

### 🧠 Task Decomposition & Function Execution

— Search —
Search[keywords:AI in education]
Search[limit:5]

— Summarize —
Summarize[maxLength:300]

— Translate —
Translate[targetLanguage:English]

### 📈 Data Analysis

— LoadData —
LoadData[filename:data.csv]
LoadData[range:2024-Q1]

— PlotGraph —
PlotGraph[type:line]
PlotGraph[xAxis:date]
PlotGraph[yAxis:sales]

### 🤖 LLM Prompt Chaining

— GenerateOutline —
GenerateOutline[title:The Future of Robotics]

— WriteSection —
WriteSection[section:Introduction]
WriteSection[length:150]

## 🔄 Parser Example (TypeScript)

```TypeScript
function parseSteps(input: string): Record<string, Record<string, string>> {
  const lines = input.split('\n');
  const result = {};
  let currentStep = '';

  for (const line of lines) {
    const stepMatch = line.match(/^---\s*(.+?)\s*---$/);
    if (stepMatch) {
      currentStep = stepMatch[1];
      result[currentStep] = {};
      continue;
    }

    const argMatch = line.match(/^(\S+)$begin:math:display$(.+?):(.+?)$end:math:display$$/);
    if (argMatch && argMatch[1] === currentStep) {
      const [, , key, val] = argMatch;
      result[currentStep][key.trim()] = val.trim();
    }
  }

  return result;
}
```

## 📦 Use Cases

- LLM prompt templates
- Autonomous agent planning
- AI pipelines and workflows
- Command-line task definitions
- Frontend state machine configs

## 📚 Roadmap

- Type and validation schema (via YAML or JSON)
- LLM auto-generation templates
- DSL → JSON converter
- Syntax highlighting & VS Code extension

## 📄 License

MIT License.
Free to use, adapt, and distribute.

## 💬 Feedback & Contributions

We welcome improvements, issues, and ideas!
Please submit via Pull Request or start a discussion.
