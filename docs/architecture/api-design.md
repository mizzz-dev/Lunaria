# API設計

最終更新日: 2026-05-27

Lunaria APIはDashboard、Bot、Worker、将来の外部連携を支える境界です。現時点ではFastifyベースのAPIとNext.js Dashboard API Routeが混在しています。

## 基本方針

- `guildId` をURLまたは認証文脈から必ず取得する
- 入力値はZod等で検証する
- 認証・認可はAPI境界で行う
- DB更新とAuditLog記録は同じ操作単位で扱う
- エラー形式は利用者向けメッセージと開発者向け詳細を分ける

## 現在の主なAPI

| API | 用途 | ステータス |
|---|---|---|
| `GET /health` | API起動確認 | 実装済み |
| `GET /api/guilds/[guildId]/quotes` | Quote一覧取得 | 実装済み |
| `POST /api/guilds/[guildId]/quotes` | Quote作成 | 実装済み |
| `POST /api/guilds/[guildId]/quotes/[quoteId]/hide` | Quote非表示 | 実装済み |
| `GET /api/guilds/[guildId]/audit-logs` | 監査ログ取得 | 実装済み |
| `GET/POST /api/guilds/[guildId]/autoresponse` | AutoResponse設定取得・保存 | 実装済み |

## エラー方針

APIは以下の考え方でエラーを返します。

| 状態 | 用途 |
|---|---|
| 400 | 入力不正 |
| 401 | 未認証 |
| 403 | 権限不足 |
| 404 | 対象なし、または参照不可 |
| 409 | 競合、重複 |
| 500 | 想定外の内部エラー |

## 将来方針

- Discord OAuth2認証をAPI境界で統一する
- OpenAPIまたは型共有でDashboardとAPIの不整合を減らす
- Public API化する場合はRate LimitとAPI Key管理を追加する
