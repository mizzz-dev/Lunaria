# デプロイ手順

最終更新日: 2026-05-27

このドキュメントは、Lunariaを検証環境または本番環境へ配置するための初期方針です。

## 初期方針

Public Alpha前は、VPS + Docker Composeを第一候補にします。将来的にはManaged DB、Managed Redis、Object Storage、Kubernetesも検討します。

## 構成候補

- apps/api
- apps/bot
- apps/dashboard
- apps/worker
- PostgreSQL
- Redis
- MinIOまたはS3互換Storage
- Reverse Proxy

## デプロイ前チェック

```powershell
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @lunaria/db db:deploy
```

## 環境変数

本番では、`.env`直置きではなくホスティング環境のSecret機能を優先します。

## DB Migration

Migrationはデプロイ前にバックアップを取得してから適用します。

## Rollback

Rollback時は以下を確認します。

- 直前のリリースタグ
- DB migrationの戻し方
- 環境変数変更の有無
- Bot command登録の変更有無

## 注意

Recording / Server Ops / Billingを本番有効化する前に、セキュリティレビューと運用手順を完了させます。
