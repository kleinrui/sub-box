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
bun run build:worker
```

首次部署需要把运行时密钥一起上传（不要把整个 `.dev.vars` 当作 secrets 文件，里面可能有 Cloudflare API token）：

```bash
cat > secrets.env << EOF
ADMIN_PASSWORD=你的管理员密码
JWT_SECRET=$(openssl rand -base64 32)
EOF

bunx wrangler deploy --secrets-file secrets.env
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
