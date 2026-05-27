# APIエンドポイント一覧

最終更新日: 2026-05-27

このドキュメントは、LunariaのAPIを利用者・開発者向けに整理した一覧です。

## Health

| Method | Path | 概要 | ステータス |
|---|---|---|---|
| GET | `/health` | API起動確認 | 実装済み |

## Dashboard API

| Method | Path | 概要 | ステータス |
|---|---|---|---|
| GET | `/api/guilds/[guildId]/quotes` | Quote一覧取得 | 実装済み |
| POST | `/api/guilds/[guildId]/quotes` | Quote作成 | 実装済み |
| POST | `/api/guilds/[guildId]/quotes/[quoteId]/hide` | Quote非表示 | 実装済み |
| GET | `/api/guilds/[guildId]/audit-logs` | 監査ログ取得 | 実装済み |
| GET | `/api/guilds/[guildId]/autoresponse` | AutoResponse設定取得 | 実装済み |
| POST | `/api/guilds/[guildId]/autoresponse` | AutoResponse設定保存 | 実装済み |

## 今後追加予定

| Method | Path | 概要 | ステータス |
|---|---|---|---|
| GET | `/api/guilds` | 管理可能ギルド一覧 | 予定 |
| GET | `/api/guilds/[guildId]/plugins` | Plugin一覧 | 予定 |
| POST | `/api/guilds/[guildId]/plugins/[pluginId]` | Plugin有効化/設定保存 | 予定 |
| GET | `/api/guilds/[guildId]/rules` | Rule一覧 | 予定 |
| POST | `/api/guilds/[guildId]/rules` | Rule作成 | 予定 |
| GET | `/api/guilds/[guildId]/billing` | 課金状態 | 予定 |
| POST | `/api/ops/requests` | Server Ops申請 | Preview |

## 設計注意

- `guildId`付きAPIは、認証ユーザーがそのギルドを管理できることを確認します。
- 認証情報はレスポンスに含めません。
- Recording / Server Ops / Billing は人間レビュー必須です。
