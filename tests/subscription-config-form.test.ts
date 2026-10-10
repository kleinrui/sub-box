import assert from "node:assert/strict";
import { test } from "node:test";
import { parse as parseYaml } from "yaml";
import { emptySubconverterVerification, subconverterVerificationReducer } from "../lib/subconverter-verification";
import { clashConfigFormSchema, defaultSubconverterOptions, subconverterFormSchema } from "../lib/subscription-config-form";

test("YAML 错误行列按原始文本报告，保留开头空行的定位", () => {
  const result = clashConfigFormSchema.safeParse({ key: "daily", name: "日常", globalConfig: "\n\nmode: rule\nmode: global\n", rules: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues.find((issue) => issue.path[0] === "globalConfig")?.message ?? "", /第 4 行、第 1 列/);
  }
  const invalidRules = clashConfigFormSchema.safeParse({ key: "daily", name: "日常", globalConfig: "", rules: "\n- [DOMAIN,\n" });
  assert.equal(invalidRules.success, false);
  if (!invalidRules.success) {
    assert.match(invalidRules.error.issues.find((issue) => issue.path[0] === "rules")?.message ?? "", /第 \d+ 行、第 \d+ 列/);
  }
});

test("Clash 规则仍须为 YAML list，允许空内容和注释", () => {
  const base = { key: "daily01", name: " 日常 ", globalConfig: null };
  assert.equal(clashConfigFormSchema.parse({ ...base, rules: "# 预留规则" }).name, "日常");
  assert.equal(clashConfigFormSchema.safeParse({ ...base, rules: "- DOMAIN-SUFFIX,example.com,DIRECT" }).success, true);
  assert.equal(clashConfigFormSchema.safeParse({ ...base, rules: "DOMAIN-SUFFIX,example.com,DIRECT" }).success, false);
  assert.equal(clashConfigFormSchema.safeParse({ ...base, rules: "" }).success, true);
});

test("整体缩进的全局配置和规则按原文保存，保存后解析内容不变", () => {
  const globalConfig = "  mode: rule\n  log-level: info\n";
  const rules = "  - DOMAIN-SUFFIX,example.com,DIRECT\n  - GEOIP,CN,DIRECT\n";
  const saved = clashConfigFormSchema.parse({ key: "daily01", name: "日常", globalConfig, rules });
  assert.equal(saved.globalConfig, globalConfig);
  assert.equal(saved.rules, rules);
  assert.ok(saved.globalConfig);
  assert.ok(saved.rules);
  assert.deepEqual(parseYaml(saved.globalConfig), { mode: "rule", "log-level": "info" });
  assert.deepEqual(parseYaml(saved.globalConfig), parseYaml(globalConfig));
  assert.deepEqual(parseYaml(saved.rules), ["DOMAIN-SUFFIX,example.com,DIRECT", "GEOIP,CN,DIRECT"]);
  assert.deepEqual(parseYaml(saved.rules), parseYaml(rules));
});

test("YAML 仅全空内容转为空值，注释和首尾空行仍保留", () => {
  const base = { key: "daily01", name: "日常" };
  const empty = clashConfigFormSchema.parse({ ...base, globalConfig: " \n\t ", rules: "\n  " });
  assert.equal(empty.globalConfig, null);
  assert.equal(empty.rules, null);
  const original = "\n  # 预留配置\n\n";
  const saved = clashConfigFormSchema.parse({ ...base, globalConfig: original, rules: original });
  assert.equal(saved.globalConfig, original);
  assert.equal(saved.rules, original);
});

test("转换参数按原样保留编码、重复参数和自定义内容，默认参数仍有效", () => {
  const options = "a=1&a=2&custom=%2f%2B+x&flag&empty=";
  const parsed = subconverterFormSchema.parse({ url: " https://example.com ", options, isDefault: false });
  assert.equal(parsed.url, "https://example.com");
  assert.equal(parsed.options, options);
  assert.equal(subconverterFormSchema.parse({ url: "https://example.com", options: defaultSubconverterOptions, isDefault: true }).options, defaultSubconverterOptions);
  assert.equal(subconverterFormSchema.safeParse({ url: "https://example.com/", options, isDefault: false }).success, false);
});

test("改地址后旧请求的成功或失败均不能覆盖当前验证", () => {
  let state = emptySubconverterVerification("https://a.example.com");
  state = subconverterVerificationReducer(state, { type: "start", url: state.url, requestId: 1 });
  state = subconverterVerificationReducer(state, { type: "change", url: "https://b.example.com", requestId: 2 });
  const changed = state;
  state = subconverterVerificationReducer(state, { type: "finish", url: "https://a.example.com", requestId: 1, status: "success", message: "旧版本" });
  assert.equal(state, changed);
  assert.equal(state.status, "idle");
  state = subconverterVerificationReducer(state, { type: "start", url: state.url, requestId: 3 });
  state = subconverterVerificationReducer(state, { type: "finish", url: "https://a.example.com", requestId: 1, status: "error", message: "旧请求失败" });
  assert.equal(state.status, "pending");
  state = subconverterVerificationReducer(state, { type: "finish", url: "https://b.example.com", requestId: 3, status: "success", message: "新版本" });
  assert.equal(state.message, "新版本");
});

test("改回同一地址后也拒绝早先验证，只接受新请求", () => {
  let state = emptySubconverterVerification("https://a.example.com");
  state = subconverterVerificationReducer(state, { type: "start", url: state.url, requestId: 1 });
  state = subconverterVerificationReducer(state, { type: "change", url: "https://b.example.com", requestId: 2 });
  state = subconverterVerificationReducer(state, { type: "change", url: "https://a.example.com", requestId: 3 });
  state = subconverterVerificationReducer(state, { type: "start", url: state.url, requestId: 4 });
  state = subconverterVerificationReducer(state, { type: "finish", url: state.url, requestId: 1, status: "success", message: "过期结果" });
  assert.equal(state.status, "pending");
  state = subconverterVerificationReducer(state, { type: "finish", url: state.url, requestId: 4, status: "error", message: "当前失败" });
  assert.equal(state.status, "error");
  assert.equal(state.message, "当前失败");
});
