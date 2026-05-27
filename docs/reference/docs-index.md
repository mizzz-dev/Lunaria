# ドキュメント索引

最終更新日: 2026-05-27

このドキュメントは、Lunaria の主要ドキュメントをカテゴリ別に整理した索引です。GitHub docsを正本、Notionをポータル/進捗管理として扱います。

## 運用方針

- 正本: GitHub repository の `docs/` と `README.md`
- ポータル: Notion の Lunaria Documentation Hub
- Issue管理: Linear の `IVR-X`
- 実装済み / 予定 / Preview / Restricted を必ず分ける
- 機能変更PRでは関連ドキュメントも更新する

## Reference

| ドキュメント | Path | 目的 | 対象読者 | 更新タイミング | ステータス |
|---|---|---|---|---|---|
| コマンド一覧 | `docs/reference/commands.md` | Discordコマンドと開発コマンドの一覧 | 利用者 / 開発者 | Botコマンド追加・変更時 | 運用中 |
| 機能一覧 | `docs/reference/features.md` | 機能カタログ | 利用者 / 開発者 | 機能追加・ステータス変更時 | 運用中 |
| 機能ステータス | `docs/reference/feature-status.md` | 実装状況の一覧 | 開発者 / 運用者 | PR merge後・リリース前 | 運用中 |
| APIエンドポイント一覧 | `docs/reference/api-endpoints.md` | API一覧 | 開発者 | API追加・変更時 | 運用中 |
| 用語集 | `docs/reference/glossary.md` | 用語の統一 | 全員 | 用語追加時 | 追加候補 |

## Setup

| ドキュメント | Path | 目的 | 対象読者 | 更新タイミング | ステータス |
|---|---|---|---|---|---|
| ローカルセットアップ | `docs/setup/local-setup.md` | 初回起動手順 | 開発者 / Codex | セットアップ手順変更時 | 運用中 |
| 環境変数一覧 | `docs/setup/environment-variables.md` | `.env` の意味整理 | 開発者 / 運用者 | 環境変数追加・変更時 | 運用中 |
| Discord Developer Portal設定 | `docs/setup/discord-developer-portal.md` | Bot/OAuth/Intent設定手順 | 開発者 / 運用者 | Discord設定変更時 | 運用中 |
| トラブルシューティング | `docs/setup/troubleshooting.md` | 既知エラー対処 | 開発者 | 失敗事例追加時 | 運用中 |

## Architecture

| ドキュメント | Path | 目的 | 対象読者 | 更新タイミング | ステータス |
|---|---|---|---|---|---|
| Lunaria Architecture | `docs/architecture/lunaria-architecture.md` | 全体構成 | 開発者 | 大きな構成変更時 | 運用中 |
| 処理フロー | `docs/architecture/process-flows.md` | 主要処理の流れ | 開発者 / 運用者 | フロー変更時 | 運用中 |
| ドメインロジック | `docs/architecture/domain-logic.md` | 責務とルール | 開発者 | ドメイン責務変更時 | 運用中 |
| データベース設計 | `docs/architecture/database-schema.md` | DBモデル方針 | 開発者 | Prisma変更時 | 運用中 |
| API設計 | `docs/architecture/api-design.md` | API設計方針 | 開発者 | API方針変更時 | 運用中 |
| Plugin System仕様 | `docs/architecture/plugin-system.md` | Plugin設計 | 開発者 | Plugin仕様変更時 | 運用中 |
| Rule Engine仕様 | `docs/architecture/rule-engine.md` | Rule仕様 | 開発者 | Rule仕様変更時 | 運用中 |
| Server Ops Architecture | `docs/architecture/server-ops-architecture.md` | Server Ops安全設計 | 開発者 / 運用者 | Server Ops着手前 | 追加候補 |

## Development

| ドキュメント | Path | 目的 | 対象読者 | 更新タイミング | ステータス |
|---|---|---|---|---|---|
| AI Native Development | `docs/development/ai-native-development.md` | AI開発運用 | 開発者 / Codex | AI運用変更時 | 運用中 |
| Linear Backlog | `docs/development/linear-backlog.md` | 初期Backlog | 開発者 | Backlog再編時 | 運用中 |
| Plugin開発ガイド | `docs/development/plugin-development-guide.md` | Plugin実装手順 | 開発者 | Plugin追加時 | 運用中 |
| Rule作成ガイド | `docs/development/rule-authoring-guide.md` | Rule作成手順 | 開発者 / 運用者 | Rule仕様変更時 | 運用中 |
| Botコマンド追加ガイド | `docs/development/bot-command-guide.md` | Botコマンド実装規約 | 開発者 | コマンド追加方針変更時 | 運用中 |
| Dashboard開発ガイド | `docs/development/dashboard-guide.md` | Dashboard実装規約 | 開発者 | UI/API方針変更時 | 運用中 |
| ドキュメント運用ルール | `docs/development/documentation-policy.md` | docs/Notion運用 | 開発者 / 運用者 | ドキュメント運用変更時 | 運用中 |

## Security / Operations / Legal

| ドキュメント | Path | 目的 | 対象読者 | 更新タイミング | ステータス |
|---|---|---|---|---|---|
| セキュリティポリシー | `docs/security/security-policy.md` | 安全方針 | 開発者 / 運用者 | 高リスク領域変更時 | 運用中 |
| Secret管理 | `docs/security/secret-management.md` | Secret運用 | 開発者 / 運用者 | Secret運用変更時 | 運用中 |
| RBAC / Audit Log ポリシー | `docs/security/rbac-audit-policy.md` | 権限と監査 | 開発者 / 運用者 | RBAC/Audit変更時 | 運用中 |
| データ保持ポリシー | `docs/security/data-retention.md` | 保存期間・削除方針 | 開発者 / 運用者 | データ種別追加時 | 運用中 |
| リリース手順 | `docs/operations/release-process.md` | リリース運用 | 開発者 / 運用者 | リリース運用変更時 | 運用中 |
| デプロイ手順 | `docs/operations/deployment-guide.md` | デプロイ方針 | 開発者 / 運用者 | 本番構成変更時 | 運用中 |
| 監視・ログ方針 | `docs/operations/monitoring-logging.md` | 監視・ログ | 運用者 | 監視構成変更時 | 運用中 |
| バックアップ・復元方針 | `docs/operations/backup-restore.md` | Backup/Restore | 運用者 | DB/Storage構成変更時 | 運用中 |
| 利用規約 草案 | `docs/legal/terms-draft.md` | Legal草案 | 運用者 | Public Alpha前 | 草案 |
| プライバシーポリシー 草案 | `docs/legal/privacy-policy-draft.md` | Privacy草案 | 運用者 | Public Alpha前 | 草案 |
| 録音ポリシー 草案 | `docs/legal/recording-policy-draft.md` | Recording方針 | 運用者 | Recording実装前 | 草案 |

## Notion運用

Notionには、各カテゴリの概要、重要リンク、更新状況、レビュー状況をまとめます。詳細本文はGitHub docsに残します。

Notion側で管理したい項目:

- ドキュメント名
- カテゴリ
- GitHub Path
- GitHub URL
- ステータス
- 優先度
- 最終レビュー日
- 更新トリガー
- 関連Issue
- 関連PR

## 次に追加する候補

| ドキュメント | 目的 | 優先度 |
|---|---|---|
| `docs/reference/glossary.md` | 用語統一 | 中 |
| `docs/adr/README.md` | ADR索引 | 中 |
| `docs/operations/public-alpha-readiness.md` | 公開前チェックリスト | 高 |
| `CHANGELOG.md` | 変更履歴 | 中 |
| `docs/architecture/server-ops-architecture.md` | Server Ops詳細設計 | 高 |
