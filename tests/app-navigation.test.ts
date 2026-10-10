import assert from "node:assert/strict";
import { test } from "node:test";
import { getAppBreadcrumbs, isAppNavActive } from "../lib/app-navigation";

test("面包屑显示实际页面，首页没有重复层级", () => {
  assert.deepEqual(getAppBreadcrumbs("/", new URLSearchParams()), [{ label: "首页" }]);
  assert.deepEqual(getAppBreadcrumbs("/clash-configs", new URLSearchParams()), [{ label: "首页", href: "/" }, { label: "Clash 配置" }]);
});

test("用户与节点深链返回父页时只清除对应详情参数", () => {
  assert.deepEqual(getAppBreadcrumbs("/users", new URLSearchParams("user=user-a&filter=with"), "用户 A"), [
    { label: "首页", href: "/" },
    { label: "用户管理", href: "/users?filter=with" },
    { label: "用户 A" },
  ]);
  assert.deepEqual(getAppBreadcrumbs("/nodes", new URLSearchParams("node=node-a&type=custom")), [
    { label: "首页", href: "/" },
    { label: "节点管理", href: "/nodes?type=custom" },
    { label: "节点详情" },
  ]);
});

test("详情及独立 API 文档归属实际父导航，首页不会在其他页面高亮", () => {
  assert.equal(isAppNavActive("/users", "/users"), true);
  assert.equal(isAppNavActive("/users/other", "/users"), true);
  assert.equal(isAppNavActive("/users", "/"), false);
  assert.equal(isAppNavActive("/api-reference", "/ai-api"), true);
  assert.deepEqual(getAppBreadcrumbs("/api-reference", new URLSearchParams()), [{ label: "首页", href: "/" }, { label: "AI 与 API", href: "/ai-api" }, { label: "API 文档" }]);
});
