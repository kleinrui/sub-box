# Sub Box 代理说明

这是一个基于 Next.js 的订阅管理应用：管理节点、用户和订阅转换，并导出整合后的 Clash 订阅。

## 技术栈

- Next.js 16 API（App Router）+ vinext / Vite + React 19 + Node.js 22
- vinext 部署到 Cloudflare Workers
- tRPC + TanStack Query / Table
- Drizzle ORM + Cloudflare D1
- shadcn/ui + Tailwind CSS 3
- 包管理使用 Bun，不要用 npm / yarn
- Lint / Format 使用 Biome，不要引入 ESLint 或 Prettier

## 常用命令

```bash
bun install
bun dev
bun run lint
bun run lint:fix
bun run format
bun run tc
bun run build
bun run deploy
```

数据更新后务必刷新页面：TRPC 写操作后使用 `router.refresh()`。

## 代码约定

- 业务逻辑放在 `server/api` 与 `server/services`。找不到对应 API 时先查现有 router，没有再补。
- 表格列的 `accessorKey` 必须唯一；需要重复数据源时改用唯一 `id` + `accessorFn`。
- Select 的空值不要用空字符串，用特殊占位值并在处理函数里转换。
- 表单用 React Hook Form + Zod。
- 复用现有表单组件（如 `NodeForm`、`UserForm`），避免平行实现。

## Git Commit

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)。

格式：

```
<type>(<scope>): <description>

[optional body]
```

- `type` 必填，常用：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`
- `scope` 可选，用模块名，如 `nodes`、`users`、`clash`、`subconverter`、`auth`
- `description` 用祈使语气，简明说明「为什么 / 带来什么」，不要只罗列改了哪些文件
- 正文可选。破坏性变更加 `!`（如 `feat(api)!: ...`）并在正文写 `BREAKING CHANGE:`

示例：

```
feat(users): 支持按节点批量关联客户端
fix(auth): 登录失败次数超限后返回 429
chore(tooling): 用 Biome 替换 ESLint 和 Prettier
```

`wrangler.jsonc` 是公开配置，应当提交，且不得写入密码或个人 `database_id`。不要提交 `.env`、`.dev.vars`、`secrets.env` 或其它密钥文件。未经明确要求不要 `git commit`、不要 `git push`。
