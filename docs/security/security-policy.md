# セキュリティポリシー

最終更新日: 2026-05-27

Lunariaは公開リポジトリとして開発され、将来的に公開Bot、SaaS、セルフホストを扱います。Secret、権限、個人データ、高リスク機能の安全性を最優先にします。

## 基本方針

- Secretをコミットしない
- 権限は最小権限にする
- 重要操作はAuditLogに残す
- guildIdでデータを分離する
- Recording / Server Ops / Billingは人間レビュー必須
- ログに認証情報を出さない

## 高リスク領域

| 領域 | 扱い |
|---|---|
| Discord OAuth2 | 人間レビュー必須 |
| Message Content Intent | 依存機能を明記 |
| RBAC | DB更新前に判定 |
| Recording | Restricted |
| Server Ops | Preview |
| Stripe | 人間レビュー必須 |
| Riot / HoYo | 規約確認必須 |

## ログ方針

ログには以下を含めません。

- Bot Token
- OAuth Secret
- API Key
- Cookie
- Session
- 暗号化鍵
- 支払い情報

## PRレビュー観点

- `.env`やSecretが含まれていないか
- 権限チェックがあるか
- 監査ログがあるか
- guildId分離が守られているか
- 高リスク機能の制約を破っていないか
