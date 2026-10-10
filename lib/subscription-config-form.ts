import { parse as parseYaml, YAMLParseError } from "yaml";
import { z } from "zod";
import { parseClashRulesYaml } from "@/lib/clash-rules";

function yamlErrorMessage(error: unknown, label: string) {
  const position = error instanceof YAMLParseError ? error.linePos?.[0] : undefined;
  return position ? `${label}的 YAML 格式有误，请检查第 ${position.line} 行、第 ${position.col} 列。` : `${label}必须是有效的 YAML 格式`;
}

export const clashConfigFormSchema = z.object({
  key: z
    .string()
    .min(2, "Key 长度须为 2–50 个字符")
    .max(50, "Key 长度须为 2–50 个字符")
    .regex(/^[a-zA-Z0-9]+$/, "Key 只能包含英文字母和数字"),
  name: z.string().trim().min(1, "请填写配置名称"),
  globalConfig: z
    .string()
    .nullable()
    .superRefine((value, context) => {
      if (!value?.trim()) return;
      try {
        parseYaml(value);
      } catch (error) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: yamlErrorMessage(error, "全局配置") });
      }
    })
    // 保留整段缩进及块文本；trim 仅用于判断内容是否全空。
    .transform((value) => (value?.trim() ? value : null)),
  rules: z
    .string()
    .nullable()
    .superRefine((value, context) => {
      if (!value?.trim()) return;
      try {
        parseClashRulesYaml(value);
      } catch (error) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof YAMLParseError ? yamlErrorMessage(error, "规则") : "规则必须是 YAML list，每条规则以 - 开头",
        });
      }
    })
    .transform((value) => (value?.trim() ? value : null)),
});

export const defaultSubconverterOptions =
  "insert=false&config=https%3A%2F%2Fraw.githubusercontent.com%2FACL4SSR%2FACL4SSR%2Fmaster%2FClash%2Fconfig%2FACL4SSR_Online_Full_NoAuto.ini&emoji=true&list=false&xudp=false&udp=false&tfo=false&expand=true&scv=false&fdn=false&new_name=true";

export const subconverterFormSchema = z.object({
  url: z
    .string()
    .trim()
    .url("请填写有效的转换器地址")
    .refine((url) => /^https?:\/\//.test(url), "转换器地址须以 http:// 或 https:// 开头")
    .refine((url) => !url.endsWith("/"), "地址末尾不能有斜杠"),
  // 按原文保存，避免改变参数编码、顺序及已有自定义参数。
  options: z.string().refine((value) => {
    try {
      new URLSearchParams(value);
      return true;
    } catch {
      return false;
    }
  }, "请使用 key=value&key=value 格式填写参数"),
  isDefault: z.boolean(),
});
