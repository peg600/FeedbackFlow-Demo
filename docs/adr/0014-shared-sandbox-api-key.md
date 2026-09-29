# 0014 — 本地与 develop Preview 共用 Sandbox API Key

- 状态：Accepted
- 决策日期：2026-09-29
- 替代：无；细化 0010 的 Sandbox 凭据配置

## 背景与约束

原 develop 导入文件排除了已有的 catalog 管理 Key，要求另行配置运行用 Key。用户明确要求把已有 `PADDLE_API_KEY` 加入文件，并因仅用于测试而共用同一个 Key。应用校验要求此变量存在，否则关闭支付入口。

## 考虑过的方案

- 分离管理与运行 Key：权限范围更小，但增加当前 Sandbox 联调配置步骤。
- 共用已有 Sandbox Key：配置直接完整，管理和应用访问共享权限及撤销影响；用户选择此方案。

## 决策与理由

本地配置与 develop Preview 导入文件共用现有 `pdl_sdbx_apikey_` Key。`.env.develop.local` 按 `.env.example` 保持相同变量及分组，保留已有支付值，并从 `.env.preview.local` 补齐 Preview 数据库和认证 Secret。未配置的可选、专用测试变量留空。

该选择仅涉及 Sandbox API Key；各 Notification Destination 仍使用各自签名 Secret，数据库和认证 Secret 继续按环境隔离。未修改 Production 文件，不允许 Live 收款。导入文件保持 Git 忽略，变量值不写入文档或日志。

## 影响与代价

部署不再因导入文件缺少 API Key 而关闭支付。共用 Key 权限较广，撤销或轮换同时影响本地工具和应用；真实收款或需要独立权限边界时应重新分离凭据。

## 验证结果

已检查导入文件与模板键集合一致、既有值未改变、Sandbox Key 与本地一致、四项 Billing 配置格式通过。尚未通过工具写入 Vercel 或验证重新部署及支付闭环。

## 重新评估条件

接入 Live、增加协作者、环境需要独立轮换或限制管理权限时重新评估。

## 相关证据

- 本次用户指令：“都用同一个 key 就行因为只是测试环境”。
- [0010](0010-paddle-sandbox-billing.md)、[环境模板](../../.env.example)、[配置校验](../../src/features/billing/server/config.ts)。
