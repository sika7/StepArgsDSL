# 🧩 StepArgs DSL

**StepArgs DSL** (StepArgs Domain-Specific Language) is a lightweight, human-friendly DSL for defining task steps and arguments in a clean, structured format. It's designed for use with LLMs, autonomous agents, prompt templates, and script orchestration.

Instead of relying on verbose or fragile JSON, StepArgs DSL offers a visually intuitive, line-based syntax that's easy to parse with regular expressions and readable for humans.

## ✨ Features

- ✅ **Simple syntax** using step blocks and key-value pairs
- ✅ **LLM-friendly**: easier to generate and parse than JSON
- ✅ **Regex-compatible**: ideal for fast prototyping
- ✅ **Structured execution**: suitable for function calls, workflows, and tool chains
- ✅ **Human-readable**: excellent for non-technical users and documentation
- ✅ **Multiline support**: handles long text, JSON, and structured data naturally

## 🔧 Syntax Overview

### 🧱 Step Block

Each task or function call is wrapped with `--- StepName ---`.

### 🔢 Arguments

#### Single-line Arguments

Arguments are written in the format:

```text
StepName[argumentName:argumentValue]
```

#### Multiline Arguments (Heredoc Style)

For longer content, use heredoc syntax:

```text
StepName[argumentName:<<<
Multiple lines of content
Including line breaks
>>>]
```

### ✅ Examples

#### Basic Usage

```text
— Translate —
Translate[sourceLanguage:Japanese]
Translate[targetLanguage:English]
Translate[text:こんにちは、世界]

— Summarize —
Summarize[maxLength:100]
```

#### Multiline Content

```text
— DocumentProcessing —
DocumentProcessing[content:<<<
Artificial Intelligence (AI) has rapidly evolved in recent years.
Machine learning, deep learning, and natural language processing
have shown remarkable progress across various domains.

The emergence of Large Language Models (LLMs) has enabled
human-like text generation and understanding capabilities.

>>>]
DocumentProcessing[outputFormat:markdown]

— APIConfiguration —
APIConfiguration[endpoint:https://api.example.com/v1/chat]
APIConfiguration[requestBody:<<<
{
  "model": "claude-4-sonnet",
  "messages": [
    {
    "role": "user",
    "content": "Hello, world!"
    }
  ],
  "max_tokens": 1000
}
>>>]
```

## 📘 Grammar (Regex)

| Component            | Regex Pattern                 |
| -------------------- | ----------------------------- |
| Step Header          | `^---\s*(.+?)\s*---$`         |
| Single-line Argument | `^(\S+)\[([^:]+):([^<].+)\]$` |
| Multiline Start      | `^(\S+)\[([^:]+):<<<\s*$`     |
| Multiline End        | `^>>>\]$`                     |

## 🧪 Sample Use Cases

### 🧠 Task Decomposition & Function Execution

```text
— Search —
Search[keywords:AI in education]
Search[limit:5]

— Summarize —
Summarize[maxLength:300]

— Translate —
Translate[targetLanguage:English]
```

### 📈 Data Analysis with Complex Configuration

```text
— DataAnalysis —
DataAnalysis[config:<<<
{
"source": "analytics.csv",
"filters": {
"date_range": "2024-01-01,2024-12-31",
"categories": ["tech", "business"]
},
"output": {
"format": "chart",
"type": "line_graph"
}
}

>>>]
DataAnalysis[chartTitle:2024 Sales Trends]
```

### 🤖 LLM Prompt Chaining

```text
— GenerateOutline —
GenerateOutline[title:The Future of Robotics]

— WriteSection —
WriteSection[section:Introduction]
WriteSection[length:150]
WriteSection[content:<<<
Robotics technology has advanced significantly in recent years,
driven by improvements in artificial intelligence, sensor technology,
and computational power. This transformation is reshaping industries
from manufacturing to healthcare.

>>>]
```

## 🔄 Parser Implementation (TypeScript)

[main.ts](./src/ts/main.ts)

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

