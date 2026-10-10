import { parse as parseYaml } from "yaml";

/**
 * 将 Clash 规则文本解析为 YAML list。注释会被 YAML 解析器忽略。
 * 空内容或仅注释视为空列表。
 */
export function parseClashRulesYaml(value: string): unknown[] {
  const parsed = parseYaml(value);
  if (parsed == null) return [];
  if (!Array.isArray(parsed)) {
    throw new Error("规则必须是 YAML list");
  }
  return parsed;
}

export function isClashRulesYamlList(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  try {
    parseClashRulesYaml(value);
    return true;
  } catch {
    return false;
  }
}
