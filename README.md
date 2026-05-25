# Lunaria

Lunaria は、ゲームコミュニティ向けの Discord ボットおよびダッシュボードです。

このプロジェクトは、プライベートな Discord ギルド向けの内部ボットとして始まりました。今後は、Web ダッシュボード、ルールエンジン、RBAC（ロールベースのアクセス制御）、監査ログ、AI アシスタンス、ゲーム連携、録音/録画の同意フロー、サーバー運用ワークフローを備えた、プラグインベースのコミュニティ運用プラットフォームへと成長させることを目的として設計されています。

## 現在のステータス

計画作成、リポジトリの基礎構築、TypeScript モノリポの骨組み、ローカルの PostgreSQL/Redis 実行環境、Discord ボットの ping コマンド、Discord OAuth によるギルドセレクター、コアプラグイン/RBAC/監査/ルールエンジンのパッケージ、および初期の Prisma 永続化スキーマ。

初期ドキュメント:

* `docs/requirements/lunaria-prd.md`
* `docs/requirements/initial-decisions.md`
* `docs/architecture/lunaria-architecture.md`
* `docs/development/ai-native-development.md`
* `docs/setup/setup-plan.md`
* `docs/development/linear-backlog.md`

## 初期 MVP

* `discord.js` をベースにした Discord ボットの基盤
* Web ダッシュボード
* Discord OAuth2 ログイン
* ギルドセレクター
* プラグインシステム
* RBAC および監査ログ
* ルールエンジン
* AutoResponse、Quote（引用）、Daily Content（日替わりコンテンツ）、LFG（募集）、および基本的なモデレーションプラグイン

## AutoResponse v1

AutoResponse v1 は、ダッシュボードから選択中のギルドに対して、1つのキーワード返信ルールを保存できます。

保存される内容:

* `PluginSetting`: AutoResponse の有効/無効および設定 JSON
* `Rule`: `messageCreate` 用の keyword / channel / cooldown / reply ルール
* `AuditLog`: 設定変更とルールの発火

ボットがメッセージの本文を読み取るには、Discord Developer Portal で Message Content Intent を有効にする必要があります。

```text
Discord Developer Portal
 > Lunaria Bot
 > Bot
 > Privileged Gateway Intents
 > Message Content Intent

```

## ローカルセットアップ

現在のローカルでの開発フロー:

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

ローカルサービスの確認:

```powershell
docker compose ps

```

もし `docker compose up -d` が `dockerDesktopLinuxEngine` が見つからないというエラーで失敗する場合は、Docker Desktop を起動して Linux エンジンの準備が整うまで待ち、その後コマンドを再実行してください。
すでに別の PostgreSQL または Redis インスタンスが `5432` や `6379` ポートを使用している場合は、ローカルの `.env` にある `POSTGRES_PORT`、`REDIS_PORT`、`DATABASE_URL`、`REDIS_URL` を変更してください。

データベースのマイグレーションは `@lunaria/db` によって管理されています。

一般的なデータベースコマンド:

```powershell
pnpm --filter @lunaria/db db:generate
pnpm --filter @lunaria/db db:dev -- --name your_migration_name
pnpm --filter @lunaria/db db:deploy

```

API シェルの起動:

```powershell
pnpm --filter @lunaria/api dev

```

起動後、`http://localhost:4000/health` を開きます。

`.env` に Discord のシークレットを設定した後、ボットシェルを起動します:

```powershell
pnpm --filter @lunaria/bot dev

```

現在のボットは `/lunaria ping` を登録し、PostgreSQL から保存された `messageCreate` ルールを実行します。メッセージのテキストを検査する AutoResponse ルールには、Discord Developer Portal で Message Content 特権インテント（Privileged Intent）を有効にする必要があります。

ギルドへのコマンド登録が `Missing Access` で失敗する場合は、以下の両方のスコープを指定してボットを対象のギルドに招待してください:

```text
bot applications.commands

```

開発用招待 URL のテンプレート:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147486720&scope=bot%20applications.commands

```

## ワークスペース

```text
apps/
 api/
 bot/
 dashboard/
 worker/
packages/
 core/
 db/
 shared/

```

## セキュリティ

このリポジトリは公開（パブリック）を前提としています。

以下のファイルや情報は**絶対にコミットしないでください**:

* `.env`
* Discord ボットのトークン
* OAuth のシークレット
* AI プロバイダーの API キー
* Riot API キー
* 本番環境のデータベースダンプ
* ユーザーの個人データ
