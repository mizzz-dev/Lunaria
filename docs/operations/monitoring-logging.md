# 監視・ログ方針

最終更新日: 2026-05-27

LunariaはBot、API、Dashboard、Worker、DB、外部API連携を持つため、ログと監視を最初から分けて考えます。

## ログ種別

| 種別 | 用途 |
|---|---|
| アプリケーションログ | API/Bot/Workerの実行状態 |
| AuditLog | 管理操作・重要操作の監査 |
| Access Log | HTTPアクセス状況 |
| Job Log | Worker/Queue処理 |
| Error Log | 例外・失敗の調査 |

## ログに出さないもの

- Token
- Secret
- Password
- API Key
- Cookie
- Session
- 支払い情報

## 監視対象

- API health
- Bot online状態
- DB接続
- Redis接続
- Worker稼働
- Queue失敗数
- Discord rate limit
- 外部APIエラー

## 将来導入候補

- OpenTelemetry
- Sentry
- Prometheus
- Grafana
- Uptime monitoring
- Status page

## 障害時対応

障害発生時は、影響範囲、開始時刻、復旧時刻、原因、再発防止を記録します。
