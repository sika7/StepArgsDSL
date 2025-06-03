# 🧩 StepArgs DSL

**StepArgs DSL** (StepArgs Domain-Specific Language) は、タスクステップと引数を明確で構造化された形式で定義するための軽量で人間にやさしいDSLです。LLM、自律エージェント、プロンプトテンプレート、スクリプトオーケストレーションでの使用を想定して設計されています。

冗長で壊れやすいJSONに依存する代わりに、StepArgs DSLは正規表現で簡単に解析でき、人間にとって読みやすい、視覚的に直感的な行ベースの構文を提供します。

## ✨ 特徴

- ✅ **シンプルな構文**: ステップブロックとキー・バリューペアを使用
- ✅ **LLMフレンドリー**: JSONより生成・解析が容易
- ✅ **正規表現対応**: 高速プロトタイピングに最適
- ✅ **構造化実行**: 関数呼び出し、ワークフロー、ツールチェーンに適用可能
- ✅ **人間が読みやすい**: 非技術者やドキュメント作成に最適
- ✅ **複数行対応**: 長いテキスト、JSON、構造化データを自然に扱える

## 🔧 構文概要

### 🧱 ステップブロック

各タスクや関数呼び出しは `--- ステップ名 ---` で囲みます。

### 🔢 引数

#### 単一行引数

引数は以下の形式で記述します：

```text
ステップ名[引数名:引数値]
```

#### 複数行引数（Heredoc形式）

長いコンテンツには、heredoc構文を使用します：

```text
ステップ名[引数名:<<<
複数行の内容
改行を含む
>>>]
```

### ✅ 例

#### 基本的な使用法

```text
— Translate —
Translate[sourceLanguage:Japanese]
Translate[targetLanguage:English]
Translate[text:こんにちは、世界]

— Summarize —
Summarize[maxLength:100]
```

#### 複数行コンテンツ

```text
— DocumentProcessing —
DocumentProcessing[content:<<<
人工知能（AI）は近年急速に進歩しています。
機械学習、深層学習、自然言語処理は
様々な分野で顕著な進歩を見せています。

大規模言語モデル（LLM）の登場により、
人間のようなテキスト生成と理解能力が可能になりました。

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

## 📘 文法（正規表現）

| 要素               | 正規表現パターン                  |
| ------------------ | --------------------------------- |
| ステップヘッダー   | `^---\s*(.+?)\s*---$`             |
| 単一行引数         | `^(\S+)\[([^:]+):([^<].+)\]$`     |
| 複数行開始         | `^(\S+)\[([^:]+):<<<\s*$`         |
| 複数行終了         | `^>>>\]$`                         |

## 🧪 サンプル使用例

### 🧠 タスク分解・関数実行

```text
— Search —
Search[keywords:教育におけるAI]
Search[limit:5]

— Summarize —
Summarize[maxLength:300]

— Translate —
Translate[targetLanguage:English]
```

### 📈 複雑な設定でのデータ分析

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
DataAnalysis[chartTitle:2024年売上トレンド]
```

### 🤖 LLMプロンプトチェーン

```text
— GenerateOutline —
GenerateOutline[title:ロボティクスの未来]

— WriteSection —
WriteSection[section:はじめに]
WriteSection[length:150]
WriteSection[content:<<<
ロボティクス技術は近年大きく進歩しており、
人工知能、センサー技術、計算能力の向上に支えられています。
この変革は製造業からヘルスケアまで、
様々な産業を再構築しています。

>>>]
```

## 🔄 パーサー実装（TypeScript）

[main.ts](./src/ts/main.ts)

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
