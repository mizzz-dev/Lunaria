# Lunaria DB

Lunaria の永続化層は Prisma + PostgreSQL を使う。

## 開発用コマンド

root の `.env` を読んで実行する。

```powershell
pnpm --filter @lunaria/db db:generate
pnpm --filter @lunaria/db db:dev -- --name migration_name
pnpm --filter @lunaria/db db:deploy
pnpm --filter @lunaria/db db:studio
```

## 初期スキーマ

- `Guild`: Discord Guild 単位のテナント
- `PluginSetting`: プラグインのギルド別ON/OFFとJSON設定
- `Rule`: Rule Engine の trigger/condition/action 定義
- `AuditLog`: 監査ログ
- `RbacAssignment`: Lunaria内のRBAC割り当て
- `DailyContentDelivery`: 日次投稿の試行結果とdeterministic dedupe管理

設定履歴、差分、ロールバック、課金/利用制限は後続migrationで追加する。
