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

### 部署到 Cloudflare

仅需几分钟即可部署到 Cloudflare worker 上，适用于小规模自用。

首先，复制配置文件：

```bash
cp wrangler.example.toml wrangler.toml
cp .dev.vars.example .dev.vars
```

安装依赖：

```bash
bun install
```

在 Cloudflare D1 中创建一个数据库（这里以 `prod-sub-box-db` 作为 database_name）：

```bash
bun wrangler d1 create prod-sub-box-db
```

创建完成后会给出一个 `database_id`，将其填入 `wrangler.toml` 中。

需要修改 `wrangler.toml` 中的以下字段：

- `database_name`（如果你更改了数据库名称）
- `database_id`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`（自行随机生成的字符串，可运行 `openssl rand -base64 32` 生成）

最后，部署应用程序：

```bash
DATABASE_NAME=prod-sub-box-db bun d1:migrate:remote
bun run deploy
```

请注意，你需要使用 Node.js v22 版本。Node.js v23 及以上版本可能会导致 build 报错。本地开发使用 Bun，代码检查与格式化使用 Biome（`bun run lint` / `bun run format`）。

### 本地开发

```bash
cp wrangler.example.toml wrangler.toml
cp .dev.vars.example .dev.vars
DATABASE_NAME=prod-sub-box-db bun d1:migrate:local
bun dev
```
