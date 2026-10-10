# Sub Box

一个简单的订阅管理应用程序。

演示站点：[sub-box-demo.awkmeo.workers.dev](https://sub-box-demo.awkmeo.workers.dev) （管理员账号：admin，密码：demo-password）

## 特点

- 轻量、易于部署，能够快速部署到 Cloudflare worker 上
- 提供多节点订阅 -> subconverter 转换 -> 合并 Clash 配置的订阅整合流程
- 单管理员登录，但支持保存多个用户配置（多个整合后的链接）
- 支持批量订阅导入/配置导入导出等功能

## 用法

一些概念：

- 节点：代表一个物理节点，可以是一个VPS。每个节点可以有多个客户端，一个客户端就是一个订阅链接。
- 用户：每个用户可以关联到多个节点客户端。每个用户能最终导出一个整合后的订阅链接。
- 订阅转换器：subconverter 链接。
- Clash 配置：设置单独的 Clash 合并配置，方便整合。

用法：

- 需要先配置一个订阅转换器，链接指向 subconverter 后端地址。可以是公开的，也可以是私有的。如需要自己部署，可用 MetaCubeX/subconverter
- 如有需要，可以设置 Clash 配置。全局配置会被合并覆盖到订阅内容中，而规则会追加到订阅规则中。
- 创建用户、节点、节点客户端。

Tips：创建节点时若填入 IP，在创建节点客户端时可用“覆盖主机”功能覆盖订阅链接中的 host。

流程：

当从给出的订阅链接获取订阅内容时，会将用户所属的所有节点客户端的订阅 url 发送到订阅转换器，并获取整合后的订阅内容。

如果需要合并配置，在 url 后加 `?config=key`，key 为 Clash 配置的 key 字段。这样整合后的订阅内容会合并该 Clash 配置中。

## 部署

### 一键部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kleinrui/sub-box)

### 命令行部署

```bash
git clone https://github.com/kleinrui/sub-box.git
cd sub-box
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars` 中的 `ADMIN_PASSWORD`，并用 `openssl rand -base64 32` 生成 `JWT_SECRET`。

```bash
bun install
bun run build
```

首次部署需要把运行时密钥一起上传（不要把整个 `.dev.vars` 当作 secrets 文件，里面可能有 Cloudflare API token）：

```bash
cat > secrets.env << EOF
ADMIN_PASSWORD=你的管理员密码
JWT_SECRET=$(openssl rand -base64 32)
EOF

bun run deploy
bunx wrangler secret bulk secrets.env
bun d1:migrate:remote
rm secrets.env
```

本机 `wrangler deploy` 可能会把 `database_id` 写回 `wrangler.jsonc`。还原该文件，不要提交。

之后更新：

```bash
git pull
bun install
bun run deploy
```

### 用 Git 连接 Cloudflare

1. Fork 本仓库，或新建 private 副本并添加 `upstream`。
2. 在 Cloudflare Dashboard 把仓库连接到 Worker。
3. 在 **Settings → Variables and Secrets** 中添加 Secret：`ADMIN_PASSWORD`、`JWT_SECRET`。
4. 推送或 Sync fork 后会自动构建部署。D1 按 `wrangler.jsonc` 自动创建，ID 不会写回仓库。

### 本地开发

```bash
cp .dev.vars.example .dev.vars
bun install
bun d1:migrate:local
bun dev
```

## AI 与 API

在后台「AI 与 API」页面创建 Token，选择只读或读写权限及有效期。完整 Token 只显示一次，数据库仅存储 SHA-256 哈希；支持查看最近使用时间、撤销和删除；删除会永久移除记录并立即使 Token 失效。只读权限允许 GET，所有 POST（包括生成订阅、验证转换器、合并配置）需要读写权限。

点击「复制接入说明」，将指向 `/llms.txt` 的短说明交给 agent；在 agent 运行环境设置 `SUB_BOX_API_TOKEN`，未设置时 agent 可向用户询问 Token。公开的 `/api/openapi.json` 文档包含认证方式、请求和响应 schema、操作用途和参数说明，不包含实际数据。业务请求使用 `Authorization: Bearer <token>`。Token 不能登录、管理其他 Token 或执行整库导入；这些操作仍仅供网页登录使用。

API 复用 `/api/trpc`，请求和响应使用 SuperJSON 包装：GET 的 `input` 是 URL 编码的 `{"json":参数}`；POST 请求体为 `{"json":参数}`；成功结果在 `result.data.json`。不要将它当作普通 REST API。最简单的无参数查询：

```bash
curl --fail-with-body "$SUB_BOX_URL/api/trpc/node.getAll" \
  -H "Authorization: Bearer $SUB_BOX_API_TOKEN"
```

升级已有站点时，必须先应用新增的 `api_tokens` 表迁移，再使用此页面：

```bash
bun run d1:migrate:remote
bun run build
bun run deploy
```

本地使用 `bun run d1:migrate:local`。上述远程命令应由部署管理员执行。

接口契约通过固定版本的 `@trpc/openapi` 生成。`bun run build` 自动重新生成 `public/openapi.json`；修改 router 后也可单独执行 `bun run openapi:generate`。新增开放操作时，在 `server/api/api-documentation.ts` 补充白名单和说明；生成脚本负责补齐 SuperJSON 包装，不要手工修改生成文件。类型入口仅导出类型，生成过程不初始化数据库。官方生成器仍处于 alpha，升级时需验证真实 HTTP 格式。

验证：

```bash
# 运行 SQLite 服务、导入校验和批量导入回归；未设置测试地址时跳过 HTTP 测试。
bun run test
# 启动本地 bun dev 后运行完整测试；仅允许 localhost/127.0.0.1。
# HTTP 测试会创建测试 Token、用户、节点和客户端，并在结束时清理。
SUB_BOX_TEST_URL=http://localhost:3000 bun with-env bun run test
```

### Scalar 文档与测试

「AI 与 API」页面的「API 文档与测试」在新标签页打开独立的 `/api-reference` 页面，要求管理员登录。Scalar 在本站打包，不使用外部 CDN 或请求代理。在 Authentication 中填写 API Token 后可发送请求；测试请求不携带网页登录 Cookie，因而能准确验证 Token 的权限。Token 不持久保存，写操作会修改真实业务数据。

`bun run openapi:generate` 同时使用 `@scalar/openapi-to-markdown` 生成公开的文档：

- `/llms.txt`：简短接入说明和模块索引，作为 agent 的首选入口。
- `/api/docs/introduction.md`：认证和 tRPC / SuperJSON 请求格式。
- `/api/docs/user.md` 等：按 7 个业务模块拆分的说明、参数和返回结构。
- `/llms-full.txt`：完整 Markdown，仅在需要全部操作时读取。
- `/api/openapi.json`：供 Scalar 和其他工具读取的原始 OpenAPI 契约。

这些文件由同一份接口契约生成，不要手动修改。Scalar 只在独立文档页加载，不影响 Token 管理页的首屏依赖。

公开的文本和 Markdown 文档明确使用 UTF-8：Cloudflare 静态资源通过 `public/_headers` 设置响应头，本地 Vite 开发服务器提供相同编码。

生成的 `public/openapi.json`、`public/llms.txt`、`public/llms-full.txt` 和 `public/api/docs/` 不提交 Git。开发启动、构建、预览、类型检查和部署命令会先生成文档，全新检出后无需手动补文件；只提交生成脚本和接口说明源文件。

### WebMCP（浏览器内的 agent）

在支持 WebMCP 的浏览器中打开本站并登录管理员，管理页面会根据公开 API 自动注册对应的业务工具。工具沿用当前登录会话，无需 API Token，也无需配置 MCP server。保持管理页面打开；退出登录或离开管理页面后工具会注销。不支持 WebMCP 的浏览器仍可正常使用页面与 HTTP API。

工具名如 `sub_box_node_getAll`、`sub_box_node_create`。对象参数直接传入（如 `{ "name": "测试节点" }`）；字符串参数使用 `{ "input": "记录 ID" }`；无参数工具传 `{}`。参数 schema 与字段说明来自生成的 OpenAPI，调用结果直接包含业务数据，不需要处理 tRPC 包装。写入后会刷新页面及查询缓存。删除与关联替换的副作用会在工具描述中注明；鉴权和参数校验仍由现有 tRPC 执行，不公开凭据管理和整库导入工具。

实现优先使用 `document.modelContext`，兼容 `navigator.modelContext`，仅在顶层管理页面注册。Codex 内置浏览器支持情况见 [Site tools 文档](https://learn.chatgpt.com/docs/webmcp)；Chrome 本地测试需按 [WebMCP 文档](https://developer.chrome.com/docs/ai/webmcp) 启用测试功能。
