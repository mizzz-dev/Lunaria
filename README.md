# Lunaria

Lunaria is a Discord bot and dashboard for game communities.

The project starts as an internal bot for a private Discord guild and is designed to grow into a plugin-based community operations platform with a web dashboard, rule engine, RBAC, audit logs, AI assistance, game integrations, recording consent flows, and server operation workflows.

## Current Status

Planning, repository foundation, TypeScript monorepo skeleton, local PostgreSQL/Redis runtime, Discord bot ping command, Discord OAuth guild selector, and the first core plugin/RBAC/audit/rule-engine package.

Initial docs:

- `docs/requirements/lunaria-prd.md`
- `docs/requirements/initial-decisions.md`
- `docs/architecture/lunaria-architecture.md`
- `docs/development/ai-native-development.md`
- `docs/setup/setup-plan.md`
- `docs/development/linear-backlog.md`

## Initial MVP

- Discord bot foundation with `discord.js`
- Web dashboard
- Discord OAuth2 login
- Guild selector
- Plugin system
- RBAC and audit logs
- Rule engine
- AutoResponse, Quote, Daily Content, LFG, and basic moderation plugins

## Local Setup

Current local flow:

```powershell
cp .env.example .env
docker compose up -d
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

Check local services:

```powershell
docker compose ps
```

If `docker compose up -d` fails with `dockerDesktopLinuxEngine` not found, start Docker Desktop and wait until the Linux engine is ready, then run the command again.
If another PostgreSQL or Redis instance already uses `5432` or `6379`, change `POSTGRES_PORT`, `REDIS_PORT`, `DATABASE_URL`, and `REDIS_URL` in your local `.env`.

Database migrations and persistent plugin storage will be added in the next milestones.

Run the API shell:

```powershell
pnpm --filter @lunaria/api dev
```

Then open `http://localhost:4000/health`.

Run the bot shell after setting Discord secrets in `.env`:

```powershell
pnpm --filter @lunaria/bot dev
```

The current bot registers `/lunaria ping` and wires the message rule engine with no default message rules. Future AutoResponse rules that inspect message text will require enabling the Message Content privileged intent in the Discord Developer Portal.

If guild command registration fails with `Missing Access`, invite the bot to the target guild with both scopes:

```text
bot applications.commands
```

Development invite URL template:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147486720&scope=bot%20applications.commands
```

## Workspace

```text
apps/
  api/
  bot/
  dashboard/
  worker/
packages/
  core/
  shared/
```

## Security

This repository is intended to be public.

Do not commit:

- `.env`
- Discord bot tokens
- OAuth secrets
- AI provider API keys
- Riot API keys
- production database dumps
- private user data
