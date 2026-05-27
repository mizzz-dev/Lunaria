# ローカルセットアップ

最終更新日: 2026-05-27

このドキュメントは、Lunaria をローカル環境で起動するための手順です。Windows では WSL2 + Docker Desktop、Linux では Docker Engine を前提にします。

## 前提ツール

- Git
- Node.js 22 以上
- pnpm / Corepack
- Docker
- Docker Compose
- Discord Developer Portal のアプリケーション

## 初回セットアップ

```powershell
git clone https://github.com/mizzz-dev/Lunaria.git
cd Lunaria
git checkout develop
corepack enable
pnpm install
cp .env.example .env
```

`.env` には実際のSecretを入れますが、`.env` 自体は絶対にコミットしません。

## 依存サービス起動

```powershell
docker compose up -d
docker compose ps
```

主な依存サービス:

- PostgreSQL
- Redis
- MinIO

## DB初期化

```powershell
pnpm --filter @lunaria/db db:generate
pnpm --filter @lunaria/db db:dev -- --name init_lunaria_core
```

既存マイグレーションだけ適用する場合:

```powershell
pnpm --filter @lunaria/db db:deploy
```

## API起動

```powershell
pnpm --filter @lunaria/api dev
```

確認:

```text
http://localhost:4000/health
```

## Bot起動

`.env` に Discord 関連の値を入れた後に起動します。

```powershell
pnpm --filter @lunaria/bot dev
```

現在のBotは `/lunaria ping` と Quote 系コマンドを中心に動作します。

## Dashboard起動

```powershell
pnpm --filter @lunaria/dashboard dev
```

Dashboard はギルド選択、AutoResponse設定、Quote管理、Audit Log閲覧の土台を持ちます。

## PR前確認

```powershell
pnpm typecheck
pnpm build
pnpm test
```

ドキュメントのみの変更でも、実行できない場合はPR本文に理由を書きます。

## 注意

- `.env`、Bot Token、OAuth Secret、API Keyはコミット禁止です。
- Message Content Intent を使う機能は Discord Developer Portal で有効化が必要です。
- Recording / Server Ops / Minecraft は未実装または制限付き機能です。
