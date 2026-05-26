# Lunaria Linear Backlog v0.1

最終更新日: 2026-05-26

## 1. Linear Context

- Workspace/account: `mizzzjp`
- Team: `ivRooom`
- Team key: `IVR`
- Project: `Lunaria Projects`
- Existing issues observed:
  - `IVR-1` Lunaria: packages/config と packages/logger を実装する
  - `IVR-2` Lunaria: AGENTS.md の PR 見出しを日本語化する
  - `IVR-3` Lunaria: packages/db に Prisma 基盤を実装する
  - `IVR-4` Lunaria: GitHub Actions CI を追加する

### Current Delivery Status

- `IVR-20` AutoResponse plugin v1: 実装、実 Discord/DB フロー確認完了
- `IVR-25` AutoResponse 複数ルール対応: 追加/編集/削除/空配列再読込み確認完了
- `IVR-26` Dashboard Audit Stream 実データ化: 差分ログ、フィルター、responsive 表示確認完了
- 次の実装単位: `IVR-21` Quote plugin v1
- 推奨ブランチ: `feature/Quote-v1`
- 実行プロンプト: `docs/development/prompts/ivr-21-quote-v1.md`
- Browser 検証記録: `docs/validation/2026-05-26-auditstream-v2-browser-validation.md`

## 2. Issue Policy

- Linear を主タスク管理にする。
- GitHub Issues は公開 repo 向けの補助として使う。
- Issue は小さく切り、1 Issue = 1 完了条件にする。
- PR 本文、コミットメッセージ、作業履歴は日本語を基本にする。
- secret、token、個人情報、production dump は Issue/PR に貼らない。

## 3. Milestone 0: Repository Foundation

### LUN-M0-01 要件定義ドキュメントを repository に固定する

目的:
Lunaria の PRD、Architecture、Setup、AI Native Development 方針を repository に残す。

受け入れ条件:

- `docs/requirements/lunaria-prd.md` がある
- `docs/architecture/lunaria-architecture.md` がある
- `docs/setup/setup-plan.md` がある
- `docs/development/ai-native-development.md` がある
- 初期決定事項が `docs/requirements/initial-decisions.md` にまとまっている

### LUN-M0-02 公開 repository 向けの安全なテンプレートを整備する

目的:
公開 GitHub repository として運用しても secret が混ざらない作業導線を作る。

作成:

- `.gitignore`
- `.env.example`
- `README.md`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/feature.md`
- `.github/ISSUE_TEMPLATE/bug.md`
- `.github/ISSUE_TEMPLATE/design.md`
- `PROMPT.md`
- `PROMPT.txt`

受け入れ条件:

- `.env` や secret 系ファイルが ignore される
- `.env.example` は placeholder のみ
- PR テンプレートに確認結果、影響範囲、secret 確認がある
- Issue テンプレートに受け入れ条件欄がある

### LUN-M0-03 ADR の初期セットを追加する

目的:
長期判断をあとから追えるようにする。

作成:

- `docs/adr/0001-use-typescript-monorepo.md`
- `docs/adr/0002-use-plugin-and-rule-engine.md`
- `docs/adr/0003-use-aws-lightsail-initially.md`
- `docs/adr/0004-use-linear-as-primary-task-system.md`

受け入れ条件:

- 各 ADR に Context, Decision, Consequences がある
- PRD/Architecture と矛盾しない

## 4. Milestone 1: Core Runtime

### LUN-M1-01 pnpm workspace と TypeScript monorepo を作る

目的:
Bot、API、Dashboard、Worker、shared packages を同じ repository で管理できるようにする。

作成:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `apps/bot`
- `apps/api`
- `apps/dashboard`
- `apps/worker`
- `packages/shared`

受け入れ条件:

- `pnpm install` が成功する
- 各 app/package の build script が定義されている
- root から lint/typecheck/test を呼べる

### LUN-M1-02 Docker Compose ローカルランタイムを作る

目的:
初心者でも PostgreSQL、Redis、各 app を起動できる土台を作る。

作成:

- `docker-compose.yml`
- `infra/docker/`
- healthcheck
- local volume

受け入れ条件:

- `docker compose up -d` で PostgreSQL と Redis が起動する
- connection URL が `.env.example` と一致する
- README に起動手順がある

### LUN-M1-03 API shell と health endpoint を作る

目的:
Dashboard、Bot、Worker が接続する API の最小基盤を作る。

受け入れ条件:

- `GET /health` が 200 を返す
- structured log が出る
- env validation がある
- test がある

### LUN-M1-04 discord.js Bot login と command registration 基盤を作る

目的:
Lunaria Bot が Discord にログインし、開発ギルドに slash command を登録できるようにする。

受け入れ条件:

- Bot が起動する
- `PRIMARY_GUILD_ID=964326043420872704` に guild command を登録できる
- `/lunaria ping` が応答する
- token はログに出ない

### LUN-M1-05 Dashboard shell を作る

目的:
dark theme 標準、light theme 対応、ja/en i18n の Dashboard 土台を作る。

受け入れ条件:

- Next.js app が起動する
- dark/light theme 切り替えがある
- ja/en の切り替えがある
- Meta/Apple 風の静かで洗練された管理画面基調になっている

## 5. Milestone 2: Auth and Guild Management

### LUN-M2-01 Discord OAuth2 login を実装する

受け入れ条件:

- Discord OAuth2 でログインできる
- session が保持される
- logout できる
- secret は repository に含まれない

### LUN-M2-02 Guild selector と管理権限チェックを実装する

受け入れ条件:

- ユーザーが所属 guild を一覧できる
- 管理権限のある guild だけ設定画面に入れる
- 初期 guild `964326043420872704` を扱える

## 6. Milestone 3: Platform Core

### LUN-M3-01 Plugin registry v1 を実装する

受け入れ条件:

- plugin metadata を登録できる
- guild ごとに enabled/disabled を保存できる
- JSON Schema で config validation できる
- dependency validation がある

### LUN-M3-02 RBAC and Audit Log v1 を実装する

受け入れ条件:

- Owner/Admin/Moderator/Event Manager/Viewer の初期 role がある
- 設定変更が audit log に残る
- audit log は guild scope を持つ

### LUN-M3-03 Rule Engine v1 を実装する

受け入れ条件:

- trigger, condition, action の型がある
- messageCreate trigger を処理できる
- cooldown と loop prevention がある
- execution log が残る
