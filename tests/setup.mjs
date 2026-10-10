import { mock } from "bun:test";

// 服务层使用独立 SQLite；仅移除构建时的 server-only 标记，
// 让同一次测试同时覆盖服务逻辑和普通 React 组件渲染。
mock.module("server-only", () => ({}));
