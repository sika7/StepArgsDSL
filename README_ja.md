# 🧩 StepArgs DSL

**StepArgs DSL** (StepArgs Domain-Specific Language) は、タスクステップと引数を明確で構造化された形式で定義するための軽量で人間にやさしいDSLです。LLM、自律エージェント、プロンプトテンプレート、スクリプトオーケストレーションでの使用を想定して設計されています。

## 🎯 なぜ StepArgs DSL なのか？

従来のアプローチでは、LLMにタスクを分解させる際にJSONを使用することが多いですが、以下の問題があります：

- **JSONは複雑で記述ミスが起きやすい** - ブラケットやクォートの管理が面倒
- **LLMにとって生成が困難** - 構文エラーが頻発しやすい
- **人間が読みにくい** - ネストした構造で可読性が低い

StepArgs DSLは、JSONの代替として設計された軽量な中間言語です。

## 🔄 実際の使用フロー

```
1. LLMがタスクを分解 → StepArgs DSL で出力
2. パーサーが変数を抽出 → 構造化データに変換
3. JSONテンプレートに変数をマップ → ツール実行用の形式に変換
4. プログラムで実行
```

### 📝 具体例

#### 1. LLMがタスクを分解（StepArgs DSL出力）

```text
--— 記事検索 —--
記事検索[キーワード:AI技術の最新動向]
記事検索[期間:過去1週間]
記事検索[件数:5]

—-- 記事取得 —--
記事取得[URL:検索結果の1番目]

—-- 要約 —--
要約[文字数上限:300]
要約[形式:箇条書き]
```

#### 2. パーサーで変数抽出

```javascript
{
  "記事検索": {
    "キーワード": "AI技術の最新動向",
    "期間": "過去1週間",
    "件数": "5"
  },
  "記事取得": {
    "URL": "検索結果の1番目"
  },
  "要約": {
    "文字数上限": "300",
    "形式": "箇条書き"
  }
}
```

#### 3. ツール実行用JSONテンプレートにマップ

```json
{
  "function": "search_articles",
  "parameters": {
    "query": "AI技術の最新動向",
    "date_range": "過去1週間",
    "limit": 5
  }
}
```

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
--- Translate —--
Translate[sourceLanguage:Japanese]
Translate[targetLanguage:English]
Translate[text:こんにちは、世界]

——— Summarize ———
Summarize[maxLength:100]
```

#### 複数行コンテンツ

```text
——— DocumentProcessing ———
DocumentProcessing[content:<<<
人工知能（AI）は近年急速に進歩しています。
機械学習、深層学習、自然言語処理は
様々な分野で顕著な進歩を見せています。

大規模言語モデル（LLM）の登場により、
人間のようなテキスト生成と理解能力が可能になりました。

>>>]
DocumentProcessing[outputFormat:markdown]

——— APIConfiguration ———
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

## 🧪 サンプル使用例

### 🧠 タスク分解・関数実行

```text
——— Search ———
Search[keywords:教育におけるAI]
Search[limit:5]

——— Summarize ———
Summarize[maxLength:300]

——— Translate ———
Translate[targetLanguage:English]
```

### 📈 複雑な設定でのデータ分析

```text
——— DataAnalysis ———
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
——— GenerateOutline ———
GenerateOutline[title:ロボティクスの未来]

——— WriteSection ———
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

[main.ts](./src/ts/main.ts) - **サンプル実装**で、UTF-8文字に対応。プロダクション用途では、より高度なUnicode処理の実装を推奨。

## 📝 プロンプトテンプレート

LLMにStepArgs DSLでタスクを分解させるためのプロンプトテンプレートも用意しています：

- 日本語版: [prompt-template-ja.md](./prompt-template-ja.md)
- 英語版: [prompt-template-en.md](./prompt-template-en.md)

## 📦 使用ケース

- **LLMタスク分解**: 複雑なタスクをステップに分解する中間表現
- **自律エージェントプランニング**: エージェントの行動計画を構造化
- **AIパイプライン**: ワークフローの設定と実行
- **コマンドライン・タスク定義**: スクリプト実行の設定ファイル
- **フロントエンドステートマシン**: UI状態管理の設定

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
