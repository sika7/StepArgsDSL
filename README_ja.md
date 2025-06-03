# 🧩 StepArgs DSL

**StepArgs DSL** (StepArgs Domain-Specific Language) は、タスクステップと引数を明確で構造化された形式で定義するための軽量で人間にやさしいDSLです。LLM、自律エージェント、プロンプトテンプレート、スクリプトオーケストレーションでの使用を想定して設計されています。

冗長で壊れやすいJSONに依存する代わりに、StepArgs DSLは正規表現で簡単に解析でき、人間にとって読みやすい、視覚的に直感的な行ベースの構文を提供します。

## ✨ 特徴

- ✅ **シンプルな構文**: ステップブロックとキー・バリューペアを使用
- ✅ **LLMフレンドリー**: JSONより生成・解析が容易
- ✅ **正規表現対応**: 高速プロトタイピングに最適
- ✅ **構造化実行**: 関数呼び出し、ワークフロー、ツールチェーンに適用可能
- ✅ **人間が読みやすい**: 非技術者やドキュメント作成に最適

## 🔧 構文概要

### 🧱 ステップブロック

各タスクや関数呼び出しは `--- ステップ名 ---` で囲みます。

### 🔢 引数

引数は以下の形式で記述します：

```
ステップ名[引数名:引数値]
```

### ✅ 例

```
--- Translate ---
Translate[sourceLanguage:Japanese]
Translate[targetLanguage:English]
Translate[text:こんにちは、世界]

--- Summarize ---
Summarize[maxLength:100]
```

## 📘 文法（正規表現）

| 要素             | 正規表現パターン         |
| ---------------- | ------------------------ |
| ステップヘッダー | `^---\s*(.+?)\s*---$`    |
| 引数行           | `^(\S+)\[(.+?):(.+?)\]$` |

## 🧪 サンプル使用例

### 🧠 タスク分解・関数実行

```
--- Search ---
Search[keywords:教育におけるAI]
Search[limit:5]

--- Summarize ---
Summarize[maxLength:300]

--- Translate ---
Translate[targetLanguage:English]
```

### 📈 データ分析

```
--- LoadData ---
LoadData[filename:data.csv]
LoadData[range:2024-Q1]

--- PlotGraph ---
PlotGraph[type:line]
PlotGraph[xAxis:date]
PlotGraph[yAxis:sales]
```

### 🤖 LLMプロンプトチェーン

```
--- GenerateOutline ---
GenerateOutline[title:ロボティクスの未来]

--- WriteSection ---
WriteSection[section:はじめに]
WriteSection[length:150]
```

## 🔄 パーサー例（TypeScript）

```typescript
function parseSteps(input: string): Record<string, Record<string, string>> {
  const lines = input.split("\n");
  const result = {};
  let currentStep = "";

  for (const line of lines) {
    const stepMatch = line.match(/^---\s*(.+?)\s*---$/);
    if (stepMatch) {
      currentStep = stepMatch[1];
      result[currentStep] = {};
      continue;
    }

    const argMatch = line.match(/^(\S+)\[(.+?):(.+?)\]$/);
    if (argMatch && argMatch[1] === currentStep) {
      const [, , key, val] = argMatch;
      result[currentStep][key.trim()] = val.trim();
    }
  }

  return result;
}
```

## 📦 使用ケース

- LLMプロンプトテンプレート
- 自律エージェントプランニング
- AIパイプラインとワークフロー
- コマンドライン・タスク定義
- フロントエンドステートマシン設定

## 📚 ロードマップ

- 型と検証スキーマ（YAMLまたはJSON経由）
- LLM自動生成テンプレート
- DSL → JSONコンバーター
- 構文ハイライト・VS Code拡張機能

## 📄 ライセンス

MIT License
自由に使用、改変、配布できます。

## 💬 フィードバック・貢献

改善、問題、アイデアを歓迎します！
プルリクエストまたはディスカッションを通じてお寄せください。
