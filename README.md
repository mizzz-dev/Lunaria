# Lunaria

Lunaria is a Discord bot and dashboard for game communities.

The project starts as an internal bot for a private Discord guild and is designed to grow into a plugin-based community operations platform with a web dashboard, rule engine, RBAC, audit logs, AI assistance, game integrations, recording consent flows, and server operation workflows.

## Current Status

Planning, repository foundation, TypeScript monorepo skeleton, and local PostgreSQL/Redis runtime.

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

Database migrations, Discord bot login, API health checks, and the real dashboard app will be added in the next milestones.

Run the API shell:

```powershell
pnpm --filter @lunaria/api dev
```

Then open `http://localhost:4000/health`.

Run the bot shell after setting Discord secrets in `.env`:

```powershell
pnpm --filter @lunaria/bot dev
```

## Workspace

```text
apps/
  api/
  bot/
  dashboard/
  worker/
packages/
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
