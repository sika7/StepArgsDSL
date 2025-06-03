# 🧩 StepArgs DSL

**StepArgs DSL** (StepArgs Domain-Specific Language) is a lightweight, human-friendly DSL for defining task steps and arguments in a clean, structured format. It's designed for use with LLMs, autonomous agents, prompt templates, and script orchestration.

## 🎯 Why StepArgs DSL?

Traditional approaches often use JSON for task decomposition with LLMs, but this has several problems:

- **JSON is complex and error-prone** - Managing brackets and quotes is cumbersome
- **Difficult for LLMs to generate** - Syntax errors occur frequently
- **Hard for humans to read** - Nested structures reduce readability

StepArgs DSL is designed as a lightweight intermediate language that serves as an alternative to JSON.

## 🔄 Actual Usage Flow

```
1. LLM decomposes tasks → Output in StepArgs DSL
2. Parser extracts variables → Convert to structured data
3. Map variables to JSON templates → Convert to tool execution format
4. Execute programmatically
```

### 📝 Concrete Example

#### 1. LLM Task Decomposition (StepArgs DSL Output)

```text
--- Article Search ---
ArticleSearch[keywords:Latest AI Technology Trends]
ArticleSearch[period:Past 1 week]
ArticleSearch[count:5]

--- Article Retrieval ---
ArticleRetrieval[URL:1st search result]

--- Summarization ---
Summarization[maxLength:300]
Summarization[format:bullet points]
```

#### 2. Variable Extraction by Parser

```javascript
{
  "ArticleSearch": {
    "keywords": "Latest AI Technology Trends",
    "period": "Past 1 week",
    "count": "5"
  },
  "ArticleRetrieval": {
    "URL": "1st search result"
  },
  "Summarization": {
    "maxLength": "300",
    "format": "bullet points"
  }
}
```

#### 3. Map to Tool Execution JSON Template

```json
{
  "function": "search_articles",
  "parameters": {
    "query": "Latest AI Technology Trends",
    "date_range": "Past 1 week",
    "limit": 5
  }
}
```

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
--— Translate —--
Translate[sourceLanguage:Japanese]
Translate[targetLanguage:English]
Translate[text:こんにちは、世界]

--— Summarize —--
Summarize[maxLength:100]
```

#### Multiline Content

```text
—-- DocumentProcessing —--
DocumentProcessing[content:<<<
Artificial Intelligence (AI) has rapidly evolved in recent years.
Machine learning, deep learning, and natural language processing
have shown remarkable progress across various domains.

The emergence of Large Language Models (LLMs) has enabled
human-like text generation and understanding capabilities.

>>>]
DocumentProcessing[outputFormat:markdown]

--— APIConfiguration —--
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

## 🧪 Sample Use Cases

### 🧠 Task Decomposition & Function Execution

```text
--— Search —--
Search[keywords:AI in education]
Search[limit:5]

--— Summarize —--
Summarize[maxLength:300]

--— Translate —--
Translate[targetLanguage:English]
```

### 📈 Data Analysis with Complex Configuration

```text
—-- DataAnalysis —--
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
—-- GenerateOutline —--
GenerateOutline[title:The Future of Robotics]

—-- WriteSection —--
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

- **Sample implementation** supporting UTF-8 characters. For production use, we recommend implementing more robust Unicode processing.
[simple.ts](./src/ts/simple.ts)
[unicode.ts](../src/ts/unicode.ts)

## 📝 Prompt Templates

We also provide prompt templates for getting LLMs to decompose tasks using StepArgs DSL:

- English: [prompt-template-en.md](./prompt-template-en.md)
- Japanese: [prompt-template-ja.md](./prompt-template-ja.md)

## 📦 Use Cases

- **LLM task decomposition**: Intermediate representation for breaking complex tasks into steps
- **Autonomous agent planning**: Structuring agent action plans
- **AI pipelines**: Workflow configuration and execution
- **Command-line task definitions**: Configuration files for script execution
- **Frontend state machine configs**: UI state management configuration

## 📚 Roadmap

- Type and validation schema (via YAML or JSON)
- LLM auto-generation templates
- DSL → JSON converter
- Syntax highlighting & VS Code extension

## 📄 License

MIT License
Free to use, adapt, and distribute.

## 💬 Feedback & Contributions

We welcome improvements, issues, and ideas!
Please submit via Pull Request or start a discussion.
