# 📦 StepArgs DSL 実装仕様書（v0.2）

**StepArgs DSL** の実装者向けガイドライン、パーサーAPI仕様、エラーハンドリング仕様を説明します。

## 🧪 正規表現による文法定義

| 要素         | 正規表現                      | 説明                                        |
| ------------ | ----------------------------- | ------------------------------------------- |
| ステップ宣言 | `^---\s*(.+?)\s*---$`         | ステップ名を`---`で囲む、前後の空白を許可   |
| 単行引数     | `^(\S+)\[([^:]+):([^<].+)\]$` | `<`で始まらない値（ヒアドキュメントと区別） |
| 複数行開始   | `^(\S+)\[([^:]+):<<<(.*)$`    | `<<<`の後は空白のみ許可（実装版）           |
| 複数行終了   | `^>>>\]$`                     | ヒアドキュメント終了マーカー                |
| コメント行   | `^\s*#.*$`                    | `#`で始まる行は無視                         |
| 空行         | `^\s*$`                       | 空行または空白のみの行は無視                |

### 正規表現の詳細解説

#### ステップ宣言: `^---\s*(.+?)\s*---$`

- `^`: 行の開始
- `---`: リテラル文字列
- `\s*`: 0回以上の空白文字
- `(.+?)`: ステップ名（非貪欲マッチ）
- `$`: 行の終了

#### 単行引数: `^(\S+)\[([^:]+):([^<].+)\]$`

- `(\S+)`: ステップ名（非空白文字の連続）
- `\[`: リテラル`[`
- `([^:]+)`: 引数名（`:`以外の文字）
- `:`: 区切り文字
- `([^<].+)`: 値（`<`以外で始まる1文字以上）
- `\]$`: リテラル`]`と行終了

#### 複数行開始: `^(\S+)\[([^:]+):<<<(.*)$`

- `<<<`: ヒアドキュメント開始マーカー
- `\s*$`: 終端に空白文字のみ許可

### パーサー実装での注意点

1. **ステップ名の一致検証**: 引数行のステップ名が現在のステップと一致するか確認
2. **エスケープ処理**: 特殊文字のエスケープは行わず、生テキストとして処理
3. **大文字小文字の区別**: ステップ名や引数名は大文字小文字を区別する

## 🔹 値の型変換とデータ型

### デフォルト動作

- **基本型**: すべての値は文字列として格納
- **空値処理**: 空文字列は有効な値として扱う
- **null処理**: 引数が存在しない場合のみnull相当

### 推奨される型判定ルール（実装側で適用）

```typescript
// 数値判定
const isNumber = (value: string) => /^-?\d+(\.\d+)?$/.test(value.trim());

// 真偽値判定
const isBoolean = (value: string) =>
  ["true", "false", "はい", "いいえ", "yes", "no"].includes(value.trim().toLowerCase());

// URL判定
const isURL = (value: string) => /^https?:\/\/.+/.test(value.trim());
```

### 特殊値の扱い

- **空文字列**: `引数名:` → 空文字列として有効
- **空白のみ**: `引数名:   ` → トリム後に空文字列
- **改行のみ**: 複数行で内容が改行のみの場合も有効

## 📦 パーサーAPI仕様

### 基本パーサー

```typescript
function parseSteps(input: string): ParsedSteps;
```

- **引数**: `input` - StepArgs DSLテキスト
- **戻り値**: `ParsedSteps` - ステップ名と引数のネストされたオブジェクト
- **特徴**: エラー検証なし、最高速

### 統合パーサー

```typescript
function parseStepArgsScript(input: string, options?: ParseOptions): FullParseResult;
```

**オプション**:

```typescript
interface ParseOptions {
  validate?: boolean; // エラー検証を実行（デフォルト: false）
  strict?: boolean; // 警告もエラー扱い（デフォルト: false）
}
```

**戻り値**:

```typescript
interface FullParseResult {
  steps: ParsedSteps; // パース結果
  validation?: ValidationResult; // エラー情報（validate: trueの場合）
}

type ParsedSteps = Record<string, Record<string, string>>;
// 例: { "検索": { "キーワード": "AI", "件数": "5" } }
```

### エラー検証関数

```typescript
function validateStepArgsScript(input: string): ValidationResult;
```

- **引数**: `input` - StepArgs DSLテキスト
- **戻り値**: `ValidationResult` - エラー・警告情報
- **特徴**: パースは実行せず検証のみ

### 使用例

```typescript
// 1. 高速パース（エラー検証なし）
const quickResult = parseSteps(dslText);
console.log(quickResult["検索"]["キーワード"]); // "AI"

// 2. 検証付きパース
const result = parseStepArgsScript(dslText, { validate: true });
if (!result.validation?.isValid) {
  console.error("エラー:", result.validation.errors);
  console.warn("警告:", result.validation.warnings);
}
console.log("パース結果:", result.steps);

// 3. 厳密モード
const strictResult = parseStepArgsScript(dslText, {
  validate: true,
  strict: true,
});
if (!strictResult.validation?.isValid) {
  throw new Error("構文エラーでパース停止");
}

// 4. エラー検証のみ
const validation = validateStepArgsScript(dslText);
validation.errors.forEach(err => {
  console.error(`${err.line}行目: ${err.message}`);
});
```

## 🚨 エラーハンドリング仕様

### エラータイプ一覧

| エラータイプ              | 説明                                       | 重要度    | 例                                        |
| ------------------------- | ------------------------------------------ | --------- | ----------------------------------------- |
| `UNTERMINATED_HEREDOC`    | ヒアドキュメントが`>>>]`で終了されていない | 🔴 エラー | `ステップ[引数:<<<\n内容\n(ファイル終了)` |
| `INVALID_HEREDOC_START`   | `<<<`の後に余計な文字が含まれている        | 🟡 警告   | `ステップ[引数:<<< 余計な文字]`           |
| `NESTED_HEREDOC`          | ヒアドキュメント内で新しい`<<<`が出現      | 🔴 エラー | ヒアドキュメント内に`<<<`を記述           |
| `STEP_BOUNDARY_VIOLATION` | ヒアドキュメント内でステップヘッダーが出現 | 🔴 エラー | ヒアドキュメント内に`--- ステップ ---`    |
| `ORPHANED_ARGUMENT`       | ステップブロック外に引数行が存在           | 🔴 エラー | ファイル先頭で`ステップ[引数:値]`         |
| `DUPLICATE_STEP`          | 同名のステップが複数回定義されている       | 🟡 警告   | `--- 検索 ---`が2回出現                   |
| `DUPLICATE_ARGUMENT`      | 同一ステップ内で引数名が重複している       | 🟡 警告   | `検索[件数:5]`と`検索[件数:10]`の重複     |
| `STEP_NAME_MISMATCH`      | 引数行のステップ名が現在ステップと不一致   | 🟡 警告   | `--- 検索 ---`内で`翻訳[言語:英語]`       |
| `EMPTY_STEP_BLOCK`        | ステップに引数が1つも定義されていない      | 🟡 警告   | `--- 検索 ---`の後に引数行なし            |
| `INVALID_ESCAPE_SEQUENCE` | 定義されていないエスケープシーケンス       | 🔴 エラー | `\z`や`\q`など未定義のエスケープ          |
| `UNTERMINATED_ESCAPE`     | 行末でバックスラッシュが未完了             | 🔴 エラー | `ステップ[引数:値\]`（行末エスケープ）    |
| `UNRECOGNIZED_SYNTAX`     | 認識できない構文行                         | 🟡 警告   | `不正な構文行`                            |

### エラー情報構造

```typescript
interface ValidationError {
  type: エラータイプ;
  line: number; // エラー発生行番号（1ベース）
  message: string; // 人間向けエラーメッセージ
  stepName?: string; // 関連するステップ名（該当する場合）
  argName?: string; // 関連する引数名（該当する場合）
}

interface ValidationResult {
  isValid: boolean; // エラーが0件の場合true
  errors: ValidationError[]; // 🔴 重大なエラー（パース停止推奨）
  warnings: ValidationError[]; // 🟡 警告（パース継続可能）
}
```

### エラー検出例

#### 1. 未終了ヒアドキュメント

```text
--- データ処理 ---
データ処理[設定:<<<
{
  "config": "value"
}
# ファイル終了（>>>]がない）
```

**エラー**: `UNTERMINATED_HEREDOC` - 5行目から開始されたヒアドキュメントが終了されていません

#### 2. ステップ境界侵犯

```text
--- 文書処理 ---
文書処理[内容:<<<
長い文章です。
--- 翻訳 ---  # ← エラー：ヒアドキュメント内でステップ開始
翻訳[言語:英語]
>>>]
```

**エラー**: `STEP_BOUNDARY_VIOLATION` - ヒアドキュメント内でステップが開始されました

#### 3. 孤児引数

```text
# ファイル先頭
検索[キーワード:AI]  # ← エラー：ステップブロックが定義されていない

--- 検索 ---
検索[件数:5]
```

**エラー**: `ORPHANED_ARGUMENT` - ステップブロック外に引数行があります

### パーサーモード仕様

#### 基本モード（`parseSteps`）

- エラー検証なし
- 最高速パフォーマンス
- 構文エラーがあっても可能な限りパース継続

#### 検証モード（`parseStepArgsScript({validate: true})`）

- 全エラータイプを検出
- エラーがあってもパース実行
- エラー・警告情報を詳細レポート

#### 厳密モード（`parseStepArgsScript({validate: true, strict: true})`）

- 警告もエラー扱い
- エラー検出時はパース結果を空で返す
- プロダクション環境推奨

### エラー処理ベストプラクティス

1. **開発時**: 検証モードでエラー・警告を確認
2. **プロダクション**: 厳密モードで確実性を確保
3. **高速処理**: 基本モードで最大パフォーマンス
4. **エラーログ**: `line`番号と`message`でデバッグ支援
5. **段階的修正**: 警告から段階的に解決

## 🧩 拡張予定（案）

| 機能              | 概要                                     |
| ----------------- | ---------------------------------------- |
| 型・必須定義      | 各引数の型や必須性を外部YAMLで定義可能に |
| 条件付き引数      | `有効:はい` による動的実行制御           |
| LLM補完ガイド生成 | DSL定義からプロンプト補助を生成          |
| DSL→JSON変換      | スクリプト的な構造化用途にも変換対応     |
| エラー検証        | 構文エラーの詳細検出とレポート機能       |

🏷️ ライセンス

この仕様は MIT ライセンス下で自由に使用・改変可能です。
