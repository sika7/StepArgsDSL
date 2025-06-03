# 📦 StepArgs DSL サンプル実装仕様書

**StepArgs DSL** のサンプル実装者向け仕様書、パーサーAPI仕様、エラーハンドリング仕様を説明します。

## 🧪 正規表現による文法定義

| 要素         | 正規表現                                     | 説明                                 |
| ------------ | -------------------------------------------- | ------------------------------------ |
| ステップ宣言 | `^---\s*([A-Za-z0-9_]+)\s*---$`              | ステップ名は英数字とアンダーバーのみ |
| 単行引数     | `^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):(.*?)\]$` | 引数名は英数字とアンダーバーのみ     |
| 複数行開始   | `^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):<<<(.*)$` | 引数名は英数字とアンダーバーのみ     |
| 複数行終了   | `^>>>\]$`                                    | ヒアドキュメント終了マーカー         |
| コメント行   | `^\s*#.*$`                                   | `#`で始まる行は無視                  |
| 空行         | `^\s*$`                                      | 空行または空白のみの行は無視         |

### 正規表現の詳細解説

#### ステップ宣言: `^---\s*([A-Za-z0-9_]+)\s*---$`

- `^`: 行の開始
- `---`: リテラル文字列
- `\s*`: 0回以上の空白文字
- `([A-Za-z0-9_]+)`: ステップ名（英数字とアンダーバーのみ）
- `$`: 行の終了

#### 単行引数: `^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):(.*?)\]$`

- `([A-Za-z0-9_]+)`: ステップ名（英数字とアンダーバーのみ）
- `\[`: リテラル`[`
- `([A-Za-z0-9_]+)`: 引数名（英数字とアンダーバーのみ）
- `:`: 区切り文字
- `(.*?)`: 値（任意の文字、日本語も含む）
- `\]$`: リテラル`]`と行終了

#### 複数行開始: `^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):<<<(.*)$`

- `([A-Za-z0-9_]+)`: ステップ名（英数字とアンダーバーのみ）
- `([A-Za-z0-9_]+)`: 引数名（英数字とアンダーバーのみ）
- `<<<`: ヒアドキュメント開始マーカー
- `(.*)`: 終端に空白文字のみ許可（警告対象）

### パーサー実装での注意点

1. **ステップ名の一致検証**: 引数行のステップ名が現在のステップと一致するか確認
2. **エスケープ処理**: 単行引数では6つの特殊文字（`[`, `]`, `:`, `<`, `>`, `\`）のエスケープに対応、複数行引数（ヒアドキュメント）では生テキストとして処理
3. **大文字小文字の区別**: ステップ名や引数名は大文字小文字を区別する

## 🔍 エスケープ処理詳細

### 実装概要

- **単行引数**: 6つの特殊文字をエスケープ処理でリテラル化
- **複数行引数**: ヒアドキュメント内は全て生テキストとして処理
- **エラー検出**: 無効なエスケープシーケンスや未終了エスケープを検出

### エスケープ対象文字

| 文字 | エスケープ記法 | 用途                     |
| ---- | -------------- | ------------------------ |
| `[`  | `\[`           | 角括弧リテラル           |
| `]`  | `\]`           | 角括弧リテラル           |
| `:`  | `\:`           | コロンリテラル           |
| `<`  | `\<`           | 小なり記号リテラル       |
| `>`  | `\>`           | 大なり記号リテラル       |
| `\`  | `\\`           | バックスラッシュリテラル |

### エスケープ使用例

```text
--- データ処理 ---
データ処理[アクセスパス:data\[0\].value]
データ処理[条件式:x \< 100 \&\& y \> 50]
データ処理[ファイルパス:C\:\\temp\\data.txt]
データ処理[URL:https\://example.com/api?key\=value\&id\=123]

--- JSON設定 ---
JSON設定[サンプル:<<<
{
  "escaped_key": "no escaping needed here",
  "array": [1, 2, 3],
  "nested": {
    "comparison": "a < b && c > d"
  }
}
>>>]
```

### 重要な注意点

1. **ヒアドキュメント内はエスケープ不要**: `<<<` から `>>>]` までは全て生テキスト
2. **行末エスケープ禁止**: `値\` のような行末エスケープはエラー
3. **未定義エスケープ禁止**: `\z` や `\n` など未定義のエスケープはエラー

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

````typescript
interface ParseOptions {
  validate?: boolean; // エラー検証を実行（デフォルト: false）
  strict?: boolean; // 警告もエラー扱い（デフォルト: false）
  limits?: LengthLimits; // 長さ制限（デフォルト: 制限なし）
}

interface LengthLimits {
  stepName?: number;     // ステップ名の最大文字数（デフォルト: 制限なし）
  argName?: number;      // 引数名の最大文字数（デフォルト: 制限なし）
  argValueSingle?: number; // 単行引数値の最大文字数（デフォルト: 制限なし）
  argValueMulti?: number;  // 複数行引数値の最大文字数（デフォルト: 制限なし）
}

**戻り値**:

```typescript
interface FullParseResult {
  steps: ParsedSteps; // パース結果
  validation?: ValidationResult; // エラー情報（validate: trueの場合）
}

type ParsedSteps = Record<string, Record<string, string>>;
// 例: { "検索": { "キーワード": "AI", "件数": "5" } }
````

### エラー検証関数

```typescript
function validateStepArgsScript(input: string): ValidationResult;
```

- **引数**: `input` - StepArgs DSLテキスト
- **戻り値**: `ValidationResult` - エラー・警告情報
- **特徴**: パースは実行せず検証のみ

### 使用例

````typescript
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

// 4. 長さ制限付きパース（セキュリティ重視）
const secureResult = parseStepArgsScript(dslText, {
  validate: true,
  limits: {
    stepName: 128,
    argName: 64,
    argValueSingle: 16384,
    argValueMulti: 1048576
  }
});

// 5. Web UI向け緩い制限
const webResult = parseStepArgsScript(dslText, {
  validate: true,
  limits: {
    stepName: 200,    // UI表示に適したサイズ
    argName: 100,
    argValueSingle: 50000
    // argValueMultiは制限なし
  }
});

// 6. エラー検証のみ
const validation = validateStepArgsScript(dslText);
validation.errors.forEach(err => {
  console.error(`${err.line}行目: ${err.message}`);
});

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
| `STEP_NAME_TOO_LONG`      | ステップ名が指定された最大長を超過         | 🔴 エラー | `--- 非常に長いステップ名... ---`（128文字超過） |
| `ARG_NAME_TOO_LONG`       | 引数名が指定された最大長を超過             | 🔴 エラー | `非常に長い引数名...[省略:...]`（64文字超過） |
| `ARG_VALUE_TOO_LONG`      | 引数値が指定された最大長を超過             | 🔴 エラー | 単行16KBまたは複数行1MB超過               |
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
````

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

## 🏷️ ライセンス

この仕様は MIT ライセンス下で自由に使用・改変可能です。
