# 📘 StepArgs DSL 仕様書（v0.2）

**StepArgs DSL（StepArgs Domain-Specific Language）** は、人間にも機械にも読みやすく、簡潔な形式でステップベースの処理を記述するための軽量DSLです。
主に LLM や自立型エージェントにおけるタスク指示・中間構造として使用されます。

## ✅ 基本構文

### 🔹 ステップブロックの記述

— ステップ名 —

- 各処理単位（タスク/関数など）を `---` で囲みます。
- ステップ内に複数の引数行を記述します。

### 🔹 引数行の記述

#### 単行引数
ステップ名[引数名:値]

#### 複数行引数（ヒアドキュメント形式）
ステップ名[引数名:<<<
複数行の内容
改行も含められます
>>>]

- `ステップ名`：ブロックと一致している必要があります。
- `引数名`：1語または短いフレーズ（日本語/英語どちらも可）
- `値`：任意の文字列、URL、数値、記号など（複数行対応）

## 🧾 サンプル

### 単行引数の例
— 記事検索 —
記事検索[キーワード:AI技術]
記事検索[期間:過去3日間]

— 記事取得 —
記事取得[URL:https://example.com/ai-news]

— 要約 —
要約[文字数上限:300]

### 複数行引数の例
— 文書処理 —
文書処理[対象:<<<
人工知能（AI）は、近年急速に発展している技術分野です。
機械学習、深層学習、自然言語処理など、様々な分野で
革新的な進歩が見られています。

特に大規模言語モデル（LLM）の登場により、
人間に近い文章生成や理解が可能になりました。
>>>]
文書処理[出力形式:markdown]

— API設定 —
API設定[エンドポイント:https://api.example.com/v1/chat]
API設定[リクエストボディ:<<<
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

## 🧪 正規表現による文法定義

| 要素         | 正規表現                                    |
| ------------ | ------------------------------------------- |
| ステップ宣言 | `^---\s*(.+?)\s*---$`                       |
| 単行引数     | `^(\S+)\[([^:]+):([^<].+)\]$`               |
| 複数行開始   | `^(\S+)\[([^:]+):<<<\s*$`                   |
| 複数行終了   | `^>>>\]$`                                   |

## 🔧 特徴と利点

| 特徴                  | 説明                                    |
| --------------------- | --------------------------------------- |
| ✅ 人間に優しい構文   | JSON より書きやすく視認性が高い         |
| ✅ 正規表現で解析可能 | 小規模でも LLM パーサーを自作できる     |
| ✅ モジュール分離可能 | ステップ単位に処理分岐しやすい          |
| ✅ LLM に強い         | JSON 出力崩壊の回避に有効               |
| ✅ 複数行対応         | 長文・JSON・構造化データも自然に記述    |

## 🧰 使用例

### 基本的なタスク指示
— 翻訳 —
翻訳[入力言語:日本語]
翻訳[出力言語:英語]
翻訳[内容:こんにちは、世界]

— 要約 —
要約[最大文字数:100]

### 複雑なデータ処理
— データ分析 —
データ分析[設定:<<<
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
データ分析[グラフタイトル:2024年度売上推移]

## 🧩 拡張予定（案）

| 機能              | 概要                                     |
| ----------------- | ---------------------------------------- |
| 型・必須定義      | 各引数の型や必須性を外部YAMLで定義可能に |
| 条件付き引数      | `有効:はい` による動的実行制御           |
| LLM補完ガイド生成 | DSL定義からプロンプト補助を生成          |
| DSL→JSON変換      | スクリプト的な構造化用途にも変換対応     |
| エラー検証        | 構文エラーの詳細検出とレポート機能       |

## 📦 パーサー実装（TypeScript例）

```ts
type ParsedSteps = Record<string, Record<string, string>>;

function parseSteps(input: string): ParsedSteps {
  const result: ParsedSteps = {};
  let currentStep = '';
  let i = 0;
  const lines = input.split('\n');
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // ステップヘッダー
    const stepMatch = line.match(/^---\s*(.+?)\s*---$/);
    if (stepMatch) {
      currentStep = stepMatch[1];
      result[currentStep] = {};
      i++;
      continue;
    }
    
    // 単行引数
    const singleArgMatch = line.match(/^(\S+)\[([^:]+):([^<].+)\]$/);
    if (singleArgMatch) {
      const [, stepName, argName, value] = singleArgMatch;
      if (stepName === currentStep) {
        result[currentStep][argName.trim()] = value.trim();
      }
      i++;
      continue;
    }
    
    // ヒアドキュメント開始
    const heredocMatch = line.match(/^(\S+)\[([^:]+):<<<\s*$/);
    if (heredocMatch) {
      const [, stepName, argName] = heredocMatch;
      if (stepName === currentStep) {
        i++;
        let content = '';
        
        // 終了マーカーまで読み込み
        while (i < lines.length && lines[i].trim() !== '>>>]') {
          content += lines[i] + '\n';
          i++;
        }
        
        result[currentStep][argName.trim()] = content.replace(/\n$/, '');
      }
      i++;
      continue;
    }
    
    i++;
  }
  
  return result;
}
```

## 🚨 エラーハンドリング

以下のエラーパターンを検出可能：

- **未終了ヒアドキュメント**: `>>>]` なしでファイル終了
- **ステップ境界侵犯**: ヒアドキュメント中に `--- ステップ ---` 出現
- **ネストしたヒアドキュメント**: `<<<` の入れ子
- **孤児引数**: ステップブロック外の引数行
- **重複ステップ**: 同名ステップの複数定義


## まとめ
- StepArgs DSL は、構造化されたタスク記述を軽量・自然に行うためのDSL。
- JSON より簡潔で、LLM に安定した出力を促す。
- 単行・複数行引数の両方に対応し、幅広い用途で活用可能。
- 構文は正規表現で簡単に処理可能。
- AIエージェント、関数実行、ワークフロー記述、プロンプト設計などに活用可能。

🏷️ ライセンス

この仕様は MIT ライセンス下で自由に使用・改変可能です。
```
