# 環境変数一覧

最終更新日: 2026-05-27

このドキュメントは Lunaria の `.env` に設定する値の意味を整理します。実値は書かず、必ず `.env.example` をもとにローカル `.env` を作成してください。

## 基本

| 変数 | 必須 | 用途 | Secret |
|---|---|---|---|
| `NODE_ENV` | 任意 | 実行環境 | No |
| `LOG_LEVEL` | 任意 | ログレベル | No |
| `DATABASE_URL` | 必須 | PostgreSQL接続 | Yes |
| `REDIS_URL` | 必須 | Redis/BullMQ接続 | Yes |
| `DAILY_CONTENT_PUBLISHER` | 任意 | Daily Content投稿transport。`disabled`または`discord` | No |

## Discord

| 変数 | 必須 | 用途 | Secret |
|---|---|---|---|
| `DISCORD_CLIENT_ID` | 必須 | Discord Application ID | No |
| `DISCORD_CLIENT_SECRET` | Dashboard/OAuthで必須 | OAuth2 Secret | Yes |
| `DISCORD_BOT_TOKEN` | Bot起動または`DAILY_CONTENT_PUBLISHER=discord`で必須 | Bot Token | Yes |
| `DISCORD_PUBLIC_KEY` | Interaction検証で使用 | Public Key | No |
| `DISCORD_REDIRECT_URI` | OAuthで必須 | Callback URL | No |
| `DISCORD_GUILD_ID` | 開発時任意 | Guildコマンド登録先 | No |

## API / Dashboard

| 変数 | 必須 | 用途 | Secret |
|---|---|---|---|
| `API_HOST` | 任意 | API bind host | No |
| `API_PORT` | 任意 | API port | No |
| `NEXTAUTH_URL` | Dashboardで使用 | Auth URL | No |
| `NEXTAUTH_SECRET` | Dashboardで使用 | Cookie/session署名 | Yes |

## Storage

| 変数 | 必須 | 用途 | Secret |
|---|---|---|---|
| `S3_ENDPOINT` | 将来機能 | S3互換Endpoint | No |
| `S3_ACCESS_KEY` | 将来機能 | S3 Access Key | Yes |
| `S3_SECRET_KEY` | 将来機能 | S3 Secret Key | Yes |
| `S3_BUCKET` | 将来機能 | Storage bucket | No |

## 外部サービス

| 変数 | 必須 | 用途 | Secret |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | 課金実装時 | Stripe API | Yes |
| `STRIPE_WEBHOOK_SECRET` | 課金実装時 | Webhook検証 | Yes |
| `RIOT_API_KEY` | Riot連携時 | Riot API | Yes |
| `RESEND_API_KEY` | メール送信時 | Resend API | Yes |
| `OPENAI_API_KEY` | AI機能時 | OpenAI API | Yes |

## 暗号化

| 変数 | 必須 | 用途 | Secret |
|---|---|---|---|
| `LUNARIA_ENCRYPTION_KEY` | 個人データ/録音保存時 | 暗号化鍵 | Yes |

## 運用ルール

- `.env` はコミット禁止です。
- Secretはログに出しません。
- GitHub ActionsではGitHub Secretsを使います。
- 本番では `.env` 直置きよりSecrets Managerやホスティング側の環境変数を優先します。
- PR本文やIssueに実値を書かないでください。
