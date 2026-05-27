# Lunaria

Lunaria は、ゲームコミュニティ向けの Discord ボットおよびダッシュボードです。

このプロジェクトは、Web ダッシュボード、ルールエンジン、RBAC、監査ログ、AI アシスタンス、ゲーム連携、録音同意フロー、サーバー運用ワークフローを備えた、プラグインベースのコミュニティ運用プラットフォームへと成長させることを目的としています。

## 現在のステータス

計画作成、リポジトリの基礎構築、TypeScript モノリポの骨組み、ローカルの PostgreSQL/Redis 実行環境、Discord ボットの ping コマンド、Discord OAuth によるギルドセレクター、コアプラグイン/RBAC/監査/ルールエンジンのパッケージ、および初期の Prisma 永続化スキーマ。

## ドキュメント入口

* [ドキュメント索引](docs/reference/docs-index.md)
* [ドキュメント運用ルール](docs/development/documentation-policy.md)

## リファレンス

* [コマンド一覧](docs/reference/commands.md)
* [機能一覧](docs/reference/features.md)
* [機能ステータス](docs/reference/feature-status.md)
* [APIエンドポイント一覧](docs/reference/api-endpoints.md)

## セットアップ

* [ローカルセットアップ](docs/setup/local-setup.md)
* [環境変数一覧](docs/setup/environment-variables.md)
* [Discord Developer Portal設定](docs/setup/discord-developer-portal.md)
* [トラブルシューティング](docs/setup/troubleshooting.md)

## アーキテクチャ詳細

* [処理フロー](docs/architecture/process-flows.md)
* [ドメインロジック](docs/architecture/domain-logic.md)
* [データベース設計](docs/architecture/database-schema.md)
* [API設計](docs/architecture/api-design.md)
* [Plugin System仕様](docs/architecture/plugin-system.md)
* [Rule Engine仕様](docs/architecture/rule-engine.md)

## 開発ガイド

* [AI Native Development](docs/development/ai-native-development.md)
* [Linear Backlog](docs/development/linear-backlog.md)
* [Plugin開発ガイド](docs/development/plugin-development-guide.md)
* [Rule作成ガイド](docs/development/rule-authoring-guide.md)
* [Botコマンド追加ガイド](docs/development/bot-command-guide.md)
* [Dashboard開発ガイド](docs/development/dashboard-guide.md)

## セキュリティ・運用・法務草案

* [セキュリティポリシー](docs/security/security-policy.md)
* [Secret管理](docs/security/secret-management.md)
* [RBAC / Audit Log ポリシー](docs/security/rbac-audit-policy.md)
* [データ保持ポリシー](docs/security/data-retention.md)
* [リリース手順](docs/operations/release-process.md)
* [デプロイ手順](docs/operations/deployment-guide.md)
* [監視・ログ方針](docs/operations/monitoring-logging.md)
* [バックアップ・復元方針](docs/operations/backup-restore.md)
* [Notion運用ガイド](docs/operations/notion-workspace-guide.md)
* [利用規約 草案](docs/legal/terms-draft.md)
* [プライバシーポリシー 草案](docs/legal/privacy-policy-draft.md)
* [録音ポリシー 草案](docs/legal/recording-policy-draft.md)

## ローカルセットアップ概要

```powershell
cp .env.example .env
docker compose up -d
pnpm install
pnpm --filter @lunaria/db db:generate
pnpm --filter @lunaria/db db:dev -- --name init_lunaria_core
pnpm typecheck
pnpm build
pnpm test
```

API起動:

```powershell
pnpm --filter @lunaria/api dev
```

Bot起動:

```powershell
pnpm --filter @lunaria/bot dev
```

詳細は [ローカルセットアップ](docs/setup/local-setup.md) を参照してください。

## セキュリティ

このリポジトリは公開を前提としています。`.env`、Discord関連の認証情報、OAuth関連の認証情報、AI/APIキー、本番DBダンプ、ユーザーの個人データはコミットしないでください。
