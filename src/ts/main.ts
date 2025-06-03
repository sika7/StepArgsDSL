// ========================================
// StepArgs DSL パーサー実装
// Unicode完全対応、エスケープ処理対応
// ========================================

// ========================================
// エスケープ処理ユーティリティ
// ========================================

/**
 * エスケープシーケンスを解除する
 */
function unescapeValue(value: string): string {
  return value.replace(/\\(.)/g, (match, char) => {
    switch (char) {
      case "[":
        return "[";
      case "]":
        return "]";
      case ":":
        return ":";
      case "<":
        return "<";
      case ">":
        return ">";
      case "\\":
        return "\\";
      default:
        throw new Error(`Invalid escape sequence: \\${char}`);
    }
  });
}

/**
 * 特殊文字をエスケープする
 */
function escapeValue(value: string): string {
  return value.replace(/[\[\]::<>\\]/g, "\\$&");
}

// ========================================
// 基本パーサー（高速・軽量）
// ========================================

type ParsedSteps = Record<string, Record<string, string>>;

function parseSteps(input: string): ParsedSteps {
  const result: ParsedSteps = {};
  let currentStep = "";
  let i = 0;
  const lines = input.split("\n");

  while (i < lines.length) {
    const line = lines[i].trim();

    // ステップヘッダー
    const stepMatch = line.match(/^---\s*([A-Za-z0-9_]+)\s*---$/);
    if (stepMatch) {
      currentStep = stepMatch[1];
      result[currentStep] = {};
      i++;
      continue;
    }

    // 単行引数 - Unicode対応正規表現
    const singleArgMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):(.*?)\]$/);
    if (singleArgMatch) {
      const [, stepName, argName, value] = singleArgMatch;
      if (stepName === currentStep) {
        try {
          result[currentStep][argName.trim()] = unescapeValue(value.trim());
        } catch (error) {
          // エスケープエラーは無視して生の値を使用（基本パーサーモード）
          result[currentStep][argName.trim()] = value.trim();
        }
      }
      i++;
      continue;
    }

    // ヒアドキュメント開始 - Unicode対応正規表現
    const heredocMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):<<<\s*$/);
    if (heredocMatch) {
      const [, stepName, argName] = heredocMatch;
      if (stepName === currentStep) {
        i++;
        let content = "";

        // 終了マーカーまで読み込み
        while (i < lines.length && lines[i].trim() !== ">>>]") {
          content += lines[i] + "\n";
          i++;
        }

        result[currentStep][argName.trim()] = content.replace(/\n$/, "");
      }
      i++;
      continue;
    }

    i++;
  }

  return result;
}

// ========================================
// 長さ制限設定
// ========================================

interface LengthLimits {
  stepName?: number; // ステップ名の最大文字数
  argName?: number; // 引数名の最大文字数
  argValueSingle?: number; // 単行引数値の最大文字数
  argValueMulti?: number; // 複数行引数値の最大文字数
}

// ========================================
// エラー検証（詳細・厳密）
// ========================================

interface ValidationError {
  type:
    | "UNTERMINATED_HEREDOC"
    | "INVALID_HEREDOC_START"
    | "NESTED_HEREDOC"
    | "STEP_BOUNDARY_VIOLATION"
    | "ORPHANED_ARGUMENT"
    | "DUPLICATE_STEP"
    | "DUPLICATE_ARGUMENT"
    | "STEP_NAME_MISMATCH"
    | "EMPTY_STEP_BLOCK"
    | "INVALID_ESCAPE_SEQUENCE"
    | "UNTERMINATED_ESCAPE"
    | "UNRECOGNIZED_SYNTAX"
    | "STEP_NAME_TOO_LONG"
    | "ARG_NAME_TOO_LONG"
    | "ARG_VALUE_TOO_LONG";
  line: number;
  message: string;
  stepName?: string;
  argName?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

function validateStepArgsScript(input: string, limits?: LengthLimits): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const lines = input.split("\n");
  let currentStep = "";
  let inHeredoc = false;
  let heredocStartLine = -1;
  let heredocInfo = { stepName: "", argName: "" };
  let heredocContent = "";
  const encounteredSteps = new Set<string>();
  const stepArguments = new Map<string, Set<string>>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // 空行やコメントは無視
    if (line === "" || line.startsWith("#")) continue;

    // ヒアドキュメント中の処理
    if (inHeredoc) {
      if (line === ">>>]") {
        inHeredoc = false;

        // ヒアドキュメント終了時に長さチェック
        if (limits?.argValueMulti && heredocContent.length > limits.argValueMulti) {
          result.warnings.push({
            type: "ARG_VALUE_TOO_LONG",
            line: heredocStartLine,
            message: `複数行引数値が長すぎます: ${heredocContent.length}文字 (制限: ${limits.argValueMulti}文字)`,
            stepName: heredocInfo.stepName,
            argName: heredocInfo.argName,
          });
        }

        heredocContent = "";
        continue;
      }

      // ヒアドキュメント内容を蓄積
      heredocContent += line + "\n";

      // ヒアドキュメント中にステップヘッダー
      if (line.match(/^---\s*(.+?)\s*---$/)) {
        result.errors.push({
          type: "STEP_BOUNDARY_VIOLATION",
          line: lineNum,
          message: `ヒアドキュメント内でステップが開始されました（${heredocStartLine}行目から開始）`,
          stepName: heredocInfo.stepName,
          argName: heredocInfo.argName,
        });
      }

      // ネストしたヒアドキュメント
      if (line.includes("<<<")) {
        result.errors.push({
          type: "NESTED_HEREDOC",
          line: lineNum,
          message: "ヒアドキュメントのネストは禁止されています",
          stepName: heredocInfo.stepName,
          argName: heredocInfo.argName,
        });
      }

      continue;
    }

    // ステップヘッダー
    const stepMatch = line.match(/^---\s*([A-Za-z0-9_]+)\s*---$/);
    if (stepMatch) {
      const stepName = stepMatch[1];

      // ステップ名長さチェック
      if (limits?.stepName && stepName.length > limits.stepName) {
        result.warnings.push({
          type: "STEP_NAME_TOO_LONG",
          line: lineNum,
          message: `ステップ名が長すぎます: ${stepName.length}文字 (制限: ${limits.stepName}文字)`,
          stepName: stepName,
        });
      }

      // 重複ステップチェック
      if (encounteredSteps.has(stepName)) {
        result.warnings.push({
          type: "DUPLICATE_STEP",
          line: lineNum,
          message: `ステップ "${stepName}" が重複しています`,
          stepName: stepName,
        });
      }

      currentStep = stepName;
      encounteredSteps.add(stepName);
      stepArguments.set(stepName, new Set());
      continue;
    }

    // 引数行（ステップ外）
    if (line.match(/^([A-Za-z0-9_]+)\[/) && currentStep === "") {
      result.errors.push({
        type: "ORPHANED_ARGUMENT",
        line: lineNum,
        message: "ステップブロック外に引数行があります",
      });
      continue;
    }

    // 単行引数 - Unicode対応正規表現で検証
    const singleArgMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):(.*?)\]$/);
    if (singleArgMatch) {
      const [, stepName, argName, value] = singleArgMatch;

      // 引数名長さチェック
      if (limits?.argName && argName.length > limits.argName) {
        result.warnings.push({
          type: "ARG_NAME_TOO_LONG",
          line: lineNum,
          message: `引数名が長すぎます: ${argName.length}文字 (制限: ${limits.argName}文字)`,
          stepName: stepName,
          argName: argName,
        });
      }

      // 引数値長さチェック
      if (limits?.argValueSingle && value.length > limits.argValueSingle) {
        result.warnings.push({
          type: "ARG_VALUE_TOO_LONG",
          line: lineNum,
          message: `単行引数値が長すぎます: ${value.length}文字 (制限: ${limits.argValueSingle}文字)`,
          stepName: stepName,
          argName: argName,
        });
      }

      // ステップ名不一致チェック
      if (stepName !== currentStep) {
        result.warnings.push({
          type: "STEP_NAME_MISMATCH",
          line: lineNum,
          message: `ステップ名が不一致です。期待値: "${currentStep}", 実際: "${stepName}"`,
          stepName: stepName,
          argName: argName,
        });
      }

      // 引数重複チェック
      const args = stepArguments.get(currentStep);
      if (args && args.has(argName)) {
        result.warnings.push({
          type: "DUPLICATE_ARGUMENT",
          line: lineNum,
          message: `引数 "${argName}" が重複しています`,
          stepName: currentStep,
          argName: argName,
        });
      } else if (args) {
        args.add(argName);
      }

      // エスケープ検証
      try {
        unescapeValue(value);
      } catch (error) {
        result.errors.push({
          type: "INVALID_ESCAPE_SEQUENCE",
          line: lineNum,
          message: error instanceof Error ? error.message : "無効なエスケープシーケンス",
          stepName: currentStep,
          argName: argName,
        });
      }

      // 行末エスケープチェック
      if (value.endsWith("\\")) {
        result.errors.push({
          type: "UNTERMINATED_ESCAPE",
          line: lineNum,
          message: "行末でエスケープ文字が未完了です",
          stepName: currentStep,
          argName: argName,
        });
      }

      continue;
    }

    // ヒアドキュメント開始 - Unicode対応正規表現で検証
    const heredocMatch = line.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+):<<<(.*)$/);
    if (heredocMatch) {
      const [, stepName, argName, extra] = heredocMatch;

      // 引数名長さチェック
      if (limits?.argName && argName.length > limits.argName) {
        result.warnings.push({
          type: "ARG_NAME_TOO_LONG",
          line: lineNum,
          message: `引数名が長すぎます: ${argName.length}文字 (制限: ${limits.argName}文字)`,
          stepName: stepName,
          argName: argName,
        });
      }

      // ステップ名不一致チェック
      if (stepName !== currentStep) {
        result.warnings.push({
          type: "STEP_NAME_MISMATCH",
          line: lineNum,
          message: `ステップ名が不一致です。期待値: "${currentStep}", 実際: "${stepName}"`,
          stepName: stepName,
          argName: argName,
        });
      }

      // 引数重複チェック
      const args = stepArguments.get(currentStep);
      if (args && args.has(argName)) {
        result.warnings.push({
          type: "DUPLICATE_ARGUMENT",
          line: lineNum,
          message: `引数 "${argName}" が重複しています`,
          stepName: currentStep,
          argName: argName,
        });
      } else if (args) {
        args.add(argName);
      }

      // <<<の後に余計な文字
      if (extra.trim() !== "") {
        result.warnings.push({
          type: "INVALID_HEREDOC_START",
          line: lineNum,
          message: `ヒアドキュメント開始マーカー後に余計な文字があります: "${extra.trim()}"`,
          stepName: stepName,
          argName: argName,
        });
      }

      inHeredoc = true;
      heredocStartLine = lineNum;
      heredocInfo = { stepName, argName };
      heredocContent = "";
      continue;
    }

    // 認識できない行
    if (line !== "") {
      result.warnings.push({
        type: "UNRECOGNIZED_SYNTAX",
        line: lineNum,
        message: `認識できない構文です: "${line}"`,
      });
    }
  }

  // ファイル終端での未終了ヒアドキュメント
  if (inHeredoc) {
    result.errors.push({
      type: "UNTERMINATED_HEREDOC",
      line: heredocStartLine,
      message: `ヒアドキュメントが終了されていません（${heredocStartLine}行目から開始）`,
      stepName: heredocInfo.stepName,
      argName: heredocInfo.argName,
    });
  }

  // 空のステップブロックチェック
  for (const [stepName, args] of stepArguments.entries()) {
    if (args.size === 0) {
      result.warnings.push({
        type: "EMPTY_STEP_BLOCK",
        line: 0, // 行番号は不明
        message: `ステップ "${stepName}" に引数がありません`,
        stepName: stepName,
      });
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

// ========================================
// 統合インターface
// ========================================

interface ParseOptions {
  validate?: boolean;
  strict?: boolean; // 警告もエラー扱い
  limits?: LengthLimits; // 長さ制限設定
}

interface FullParseResult {
  steps: ParsedSteps;
  validation?: ValidationResult;
}

function parseStepArgsScript(input: string, options: ParseOptions = {}): FullParseResult {
  const result: FullParseResult = {
    steps: {},
  };

  // バリデーション実行
  if (options.validate) {
    result.validation = validateStepArgsScript(input, options.limits);

    // エラーがある場合の動作
    if (!result.validation.isValid) {
      if (options.strict) {
        // 厳密モード：エラーがあれば空の結果を返す
        return result;
      }
      // 通常モード：エラーがあっても可能な限りパース
    }

    // 厳密モードで警告もエラー扱い
    if (options.strict && result.validation.warnings.length > 0) {
      result.validation.isValid = false;
      return result;
    }
  }

  // パース実行
  result.steps = parseSteps(input);

  return result;
}

// ========================================
// プリセット制限値
// ========================================

const DEFAULT_LIMITS: LengthLimits = {
  stepName: 128,
  argName: 64,
  argValueSingle: 16384,
  argValueMulti: 1048576,
};

const WEB_UI_LIMITS: LengthLimits = {
  stepName: 200,
  argName: 100,
  argValueSingle: 50000,
  argValueMulti: 500000,
};

const STRICT_LIMITS: LengthLimits = {
  stepName: 64,
  argName: 32,
  argValueSingle: 4096,
  argValueMulti: 262144,
};

// ========================================
// 使用例
// ========================================

// サンプル入力データ
// const sampleInput = `--- 翻訳 ---
// 翻訳[入力言語:日本語]
// 翻訳[出力言語:英語]
// 翻訳[内容:こんにちは、世界]
//
// --- 要約 ---
// 要約[最大文字数:100]`;

// 高速パース（エラー検証なし）
// const quickResult = parseSteps(sampleInput);

// 検証付きパース
// const validatedResult = parseStepArgsScript(sampleInput, { validate: true });
// if (!validatedResult.validation?.isValid) {
//   console.error("構文エラーがあります:", validatedResult.validation.errors);
// }

// 厳密モード（警告もエラー扱い）
// const strictResult = parseStepArgsScript(sampleInput, {
//   validate: true,
//   strict: true,
// });

// 長さ制限付きパース
// const limitedResult = parseStepArgsScript(sampleInput, {
//   validate: true,
//   limits: DEFAULT_LIMITS,
// });

// カスタム制限
// const customResult = parseStepArgsScript(sampleInput, {
//   validate: true,
//   limits: {
//     stepName: 50,
//     argName: 30,
//     argValueSingle: 1000,
//   },
// });

export {
  parseSteps,
  validateStepArgsScript,
  parseStepArgsScript,
  unescapeValue,
  escapeValue,
  DEFAULT_LIMITS,
  WEB_UI_LIMITS,
  STRICT_LIMITS,
  type ParsedSteps,
  type ValidationError,
  type ValidationResult,
  type ParseOptions,
  type FullParseResult,
  type LengthLimits,
};
