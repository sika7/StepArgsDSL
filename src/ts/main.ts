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
    | "UNRECOGNIZED_SYNTAX";
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

function validateStepArgsScript(input: string): ValidationResult {
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
  const encounteredSteps = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // 空行やコメントは無視
    if (line === "" || line.startsWith("#")) continue;

    // ヒアドキュメント中の処理
    if (inHeredoc) {
      if (line === ">>>]") {
        inHeredoc = false;
        continue;
      }

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
    const stepMatch = line.match(/^---\s*(.+?)\s*---$/);
    if (stepMatch) {
      const stepName = stepMatch[1];

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
      continue;
    }

    // 引数行（ステップ外）
    if (line.match(/^(\S+)\[/) && currentStep === "") {
      result.errors.push({
        type: "ORPHANED_ARGUMENT",
        line: lineNum,
        message: "ステップブロック外に引数行があります",
      });
      continue;
    }

    // 単行引数
    const singleArgMatch = line.match(/^(\S+)\[([^:]+):([^<].+)\]$/);
    if (singleArgMatch) {
      // 基本的な検証はここで可能
      continue;
    }

    // ヒアドキュメント開始
    const heredocMatch = line.match(/^(\S+)\[([^:]+):<<<(.*)$/);
    if (heredocMatch) {
      const [, stepName, argName, extra] = heredocMatch;

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

  result.isValid = result.errors.length === 0;
  return result;
}

// ========================================
// 統合インターface
// ========================================

interface ParseOptions {
  validate?: boolean;
  strict?: boolean; // 警告もエラー扱い
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
    result.validation = validateStepArgsScript(input);

    // エラーがある場合の動作
    if (!result.validation.isValid) {
      if (options.strict) {
        // 厳密モード：エラーがあれば空の結果を返す
        return result;
      }
      // 通常モード：エラーがあっても可能な限りパース
    }
  }

  // パース実行
  result.steps = parseSteps(input);

  return result;
}

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

export {
  parseSteps,
  validateStepArgsScript,
  parseStepArgsScript,
  type ParsedSteps,
  type ValidationError,
  type ValidationResult,
  type ParseOptions,
  type FullParseResult,
};
