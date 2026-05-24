# Lunaria Setup Plan v0.1

最終更新日: 2026-05-24

## 1. ゴール

最終的に初心者でも Docker Compose で Lunaria を起動できるようにする。

目標コマンド:

```powershell
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

## 2. 必要になるもの

ローカル開発:

- Node.js LTS
- pnpm
- Docker Desktop
- PostgreSQL container
- Redis container
- Discord Developer Portal application
- Discord Bot token
- Discord OAuth2 client id/secret
- 初期接続 guild id: `964326043420872704`

将来必要:

- OpenAI API key
- Anthropic API key
- Gemini API key
- Riot API key
- S3 compatible storage
- AWS account
- domain: `ivRm.jp`

## 3. Environment Variables Draft

```env
NODE_ENV=development

DATABASE_URL=postgresql://lunaria:lunaria@localhost:5432/lunaria
REDIS_URL=redis://localhost:6379

DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/discord/callback

APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000

PRIMARY_GUILD_ID=964326043420872704
PUBLIC_DASHBOARD_DOMAIN=ivRm.jp

ENCRYPTION_KEY=
SESSION_SECRET=

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
RIOT_API_KEY=
```

## 4. Local Ports

- Dashboard: http://localhost:3000
- API: http://localhost:4000
- Bot health: http://localhost:4100
- Worker health: http://localhost:4200
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 5. Discord Setup Draft

1. Discord Developer Portal で application を作成
2. Bot を作成
3. token を `.env` に設定
4. OAuth2 redirect URL を設定
5. bot invite URL を作成
6. guild に Bot を招待
7. guild id を development seed に登録
8. slash commands を登録

必要 intents:

- Guilds
- Guild Members
- Guild Messages
- Message Content
- Guild Voice States

録音や高度機能は、後から追加時に intent と権限を再確認する。

## 6. First Implementation Milestones

Milestone 0: Repository Foundation

- ai-native-development-template の必要部分を導入
- README
- docs
- GitHub Issue/PR templates
- basic monorepo structure

Milestone 1: Core Runtime

- pnpm workspace
- TypeScript config
- Docker Compose
- PostgreSQL
- Redis
- API health check
- Bot login
- Dashboard shell

Milestone 2: Auth and Guild Management

- Discord OAuth2
- guild selector
- admin permission check
- guild settings table

Milestone 3: Plugin and Rule Core

- plugin registry
- guild plugin settings
- config schema validation
- rule engine v1
- audit log

Milestone 4: MVP Plugins

- AutoResponse
- Quote
- Daily Content
- LFG basic
- Moderation basic

Milestone 5: Polish and Internal Release

- dark/light theme
- i18n ja/en
- setup guide
- seed data
- basic tests
- first internal guild rollout

## 7. Initial Hosting Plan

初期本番は AWS Lightsail を使う。
目標予算は月額 2,000 円以内。

最初の構成:

- Lightsail instance
- Docker Compose
- app containers
- PostgreSQL container
- Redis container
- reverse proxy
- HTTPS
- domain `ivRm.jp`

`ivRm.jp` はこれから取得する。
取得後に DNS を Lightsail static IP へ向ける。

公開 GitHub repository で運用するため、以下を必ず守る。

- `.env` を commit しない
- `.env.example` はダミー値のみ
- Discord token、OAuth secret、AI API key は secret として扱う
- production database dump を commit しない
