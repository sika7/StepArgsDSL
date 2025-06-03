type ParsedSteps = Record<string, Record<string, string>>;

function parseSteps(input: string): ParsedSteps {
  const lines = input.split('\n');
  const result: ParsedSteps = {};
  let currentStep = '';

  for (const lineRaw of lines) {
    const line = lineRaw.trim();

    // ステップ区切り（例：--- 要約 ---）
    const stepHeader = line.match(/^---\s*(.+?)\s*---$/);
    if (stepHeader) {
      currentStep = stepHeader[1];
      if (!result[currentStep]) {
        result[currentStep] = {};
      }
      continue;
    }

    // 引数行（例：要約[文字数上限:300]）
    const argMatch = line.match(/^(\S+)\[(.+?):(.+?)\]$/);
    if (argMatch) {
      const [, stepName, argName, value] = argMatch.map(s => s.trim());
      // ステップ名が明示されていても、ブロックと一致しない場合は無視
      if (stepName !== currentStep) continue;
      result[currentStep][argName] = value;
    }
  }

  return result;
}
