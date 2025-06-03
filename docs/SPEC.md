# 📘 StepArgs DSL 仕様書（v0.1）

**StepArgs DSL（StepArgs Domain-Specific Language）** は、人間にも機械にも読みやすく、簡潔な形式でステップベースの処理を記述するための軽量DSLです。
主に LLM や自立型エージェントにおけるタスク指示・中間構造として使用されます。

## ✅ 基本構文

### 🔹 ステップブロックの記述

— ステップ名 —

- 各処理単位（タスク/関数など）を `---` で囲みます。
- ステップ内に複数の引数行を記述します。

### 🔹 引数行の記述

ステップ名[引数名:値]

- `ステップ名`：ブロックと一致している必要があります。
- `引数名`：1語または短いフレーズ（日本語/英語どちらも可）
- `値`：任意の文字列、URL、数値、記号など

## 🧾 サンプル

— 記事検索 —
記事検索[キーワード:AI技術]
記事検索[期間:過去3日間]

— 記事取得 —
記事取得[URL:https://example.com/ai-news]

— 要約 —
要約[文字数上限:300]

## 🧪 正規表現による文法定義

| 要素         | 正規表現                                                   |
| ------------ | ---------------------------------------------------------- |
| ステップ宣言 | `^---\s*(.+?)\s*---$`                                      |
| 引数行       | `^(\S+)$begin:math:display$(.+?):(.+?)$end:math:display$$` |

## 🔧 特徴と利点

| 特徴                  | 説明                              |
| --------------------- | --------------------------------- |
| ✅ 人間に優しい構文   | JSON より書きやすく視認性が高い   |
| ✅ 正規表現で解析可能 | 小規模でも LLMPARSER を自作できる |
| ✅ モジュール分離可能 | ステップ単位に処理分岐しやすい    |
| ✅ LLM に強い         | JSON 出力崩壊の回避に有効         |

## 🧰 使用例

— 翻訳 —
翻訳[入力言語:日本語]
翻訳[出力言語:英語]
翻訳[内容:こんにちは、世界]

— 要約 —
要約[最大文字数:100]

## 🧩 拡張予定（案）

| 機能              | 概要                                     |
| ----------------- | ---------------------------------------- |
| 型・必須定義      | 各引数の型や必須性を外部YAMLで定義可能に |
| 条件付き引数      | `有効:はい` による動的実行制御           |
| LLM補完ガイド生成 | DSL定義からプロンプト補助を生成          |
| DSL→JSON変換      | スクリプト的な構造化用途にも変換対応     |

## 📦 パーサー実装（TypeScript例）

```ts
function parseSteps(input: string): Record<string, Record<string, string>> {
  const lines = input.split('\n');
  const result = {};
  let currentStep = '';

  for (const line of lines) {
    const trimmed = line.trim();

    const stepMatch = trimmed.match(/^---\s*(.+?)\s*---$/);
    if (stepMatch) {
      currentStep = stepMatch[1];
      result[currentStep] = {};
      continue;
    }

    const argMatch = trimmed.match(/^(\S+)$begin:math:display$(.+?):(.+?)$end:math:display$$/);
    if (argMatch && argMatch[1] === currentStep) {
      const [, , key, val] = argMatch;
      result[currentStep][key.trim()] = val.trim();
    }
  }

  return result;
}


## まとめ
- StepArgs DSL は、構造化されたタスク記述を軽量・自然に行うためのDSL。
- JSON より簡潔で、LLM に安定した出力を促す。
- 構文は正規表現で簡単に処理可能。
- AIエージェント、関数実行、ワークフロー記述、プロンプト設計などに活用可能。

🏷️ ライセンス

この仕様は MIT ライセンス下で自由に使用・改変可能です。
```
