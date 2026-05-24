# Lunaria Repository Foundation Plan v0.1

最終更新日: 2026-05-24

## 1. 目的

Lunaria の repository を、公開 GitHub repository と AI Native Development に耐える形へ整える。
まずは実装よりも、作業単位、テンプレート、secret 管理、ADR、README、セットアップ導線を先に固定する。

## 2. Foundation Scope

Milestone 0 で入れるもの:

- README
- `.gitignore`
- `.env.example`
- GitHub PR template
- GitHub Issue templates
- AI prompt files
- ADR folder
- initial ADRs
- Linear backlog document

Milestone 1 で入れるもの:

- pnpm workspace
- TypeScript base config
- app/package folders
- Docker Compose
- API health
- Bot login
- Dashboard shell

## 3. Public Repository Safety

公開 repository 前提のため、次を必須にする。

- `.env` は commit しない
- secret 値は docs に書かない
- production DB dump は commit しない
- Discord token、OAuth secret、AI API key は placeholder にする
- GitHub Actions にも secret 値を直書きしない
- security-sensitive な PR は review 必須

## 4. Recommended First PRs

1. docs: 要件定義と初期決定事項を追加する
2. chore: 公開 repository 向けテンプレートを追加する
3. docs: ADR 初期セットを追加する
4. chore: pnpm workspace と TypeScript config を追加する
5. chore: Docker Compose で PostgreSQL/Redis を起動できるようにする
6. feat(api): health endpoint を追加する
7. feat(bot): discord.js bot login と ping command を追加する
8. feat(dashboard): dashboard shell を追加する

## 5. Branch Naming

Codex app の既定に合わせ、branch prefix は `codex/` を使う。

例:

- `codex/docs-requirements-v0`
- `codex/repository-foundation`
- `codex/core-runtime`
- `codex/bot-login`

## 6. Commit Message Style

日本語を基本にする。

例:

- `docs: Lunariaの初期要件定義を追加`
- `chore: 公開リポジトリ向けテンプレートを追加`
- `feat(bot): pingコマンドを追加`
- `test(api): health endpointのテストを追加`

