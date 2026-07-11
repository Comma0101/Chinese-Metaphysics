# 知几 · Zhiji

知几是面向北美华人专业人士的私人八字咨询服务，聚焦未来 90 天内的重大人生节点。产品以传统命理作为可解释的文化框架，由具名主理人审核并承担每个案例的判断责任；不声称科学预测，不提供医疗、法律、移民或投资建议，也不销售改运物品。

当前目标是验证一个安全、可持续的高端产品化服务，而不是上线大众算命平台。完整研究、证据边界与 90 天验证规则见 [`docs/research/README.md`](docs/research/README.md)。

## 当前试点

- 仅限受邀、符合范围的成年人；上线地区采用明确 allowlist。
- 工作假设为 US$49 可抵扣/符合规则可退的校准押金，以及 US$388 创始批次完整服务。
- 支付前只收集资格筛选所需信息；不在此阶段收集生辰或具体困局。
- `PAID_PILOT_ENABLED=false` 是默认且必须保留的商业熔断开关。
- `NEWSLETTER_ENABLED=false` 默认关闭邮件地址收集；它不是发信开关。
- 不做订阅、每日运势、自动 AI 大师、原生 App、市场平台或中国大陆发行。

法律、经营地点、支付处理商、隐私、条款/退款、安全流程、邮件域名和限流全部通过人工审核前，不得启用真实收费。

## 系统边界

- **Supabase Postgres**：保存申请、同意记录、状态事件、Stripe 事件、通知 outbox 和邮件订阅。浏览器没有数据库权限；服务端使用 transaction-pooler 连接。
- **Stripe Checkout + Stripe webhook**：服务端固定押金金额；只有签名 webhook 可以确认支付、退款和争议状态。成功页不能自行标记付款。
- **Resend**：事务邮件通过持久化 outbox 和定时 worker 投递。结账不依赖实时邮件成功，且邮件内容不包含生辰或客户叙事。
- **主理人 CLI**：通过服务端数据库凭据执行最小化列表、主体导出、撤回、脱敏和留存清理；默认不输出敏感字段。
- **Newsletter**：代码可将规范化邮箱 conflict-safe upsert 到 Postgres，但当前必须保持关闭。Newsletter collection and sending remain disabled pending immutable consent evidence, unsubscribe, and re-consent workflows. No marketing email may be sent from these records；现有记录不能被视为可发送名单。

文件系统不是生产数据存储。旧的 JSON 问事/订阅流程不得用于真实客户。

## 本地运行

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

至少配置 `SUPABASE_DATABASE_URL` 才能测试持久化。支付试点还需要 Stripe、Resend、定时任务和 allowlist 相关变量；变量说明见 [`.env.local.example`](.env.local.example)。保持 `PAID_PILOT_ENABLED=false`，直到所有 launch gate 已书面确认。

同样保持 `NEWSLETTER_ENABLED=false`。未来即使为受控测试打开，它也只允许收集，不允许发信；在不可变同意证据、退订和重新同意流程完成并审核前，不得将任何 subscriber 当作营销许可。

将 Supabase migration 按文件名顺序应用：

```text
supabase/migrations/202607100001_paid_pilot.sql
supabase/migrations/202607100002_notification_delivery_fencing.sql
```

本地数据库集成测试使用独立的 `TEST_DATABASE_URL`。未提供时，相关测试会明确跳过，不代表数据库行为已经现场验证。

## 验证

```bash
npm test
npm run typecheck
npm run build
```

上线前还需验证 Stripe webhook 签名、Resend 域名与 worker 调度、数据库 migration、处理商真实类别批准、WAF/限流，以及 `docs/operations/` 下的操作手册。

## 操作文档

- [研究与产品决策](docs/research/README.md)
- [付费试点设计](docs/superpowers/specs/2026-07-10-paid-pilot-foundation-design.md)
- [主理人操作手册](docs/operations/pilot-operations.md)
- [通知数据流](docs/operations/notification-data-flow.md)
- [付费试点上线门槛](docs/operations/paid-pilot-launch-gates.md)
