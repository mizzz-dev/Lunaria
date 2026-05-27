# 処理フロー

最終更新日: 2026-05-27

このドキュメントは、Lunaria の主要な処理フローを開発者・運用者向けに整理したものです。実装済み機能と予定機能を混同しないよう、各フローにステータスを明記します。

## ステータス凡例

| ステータス | 意味 |
|---|---|
| 実装済み | develop ブランチ上に実装がある |
| 開発中 | 実装の一部がある、または検証中 |
| 予定 | 要件定義済みだが未実装 |
| Preview | 高リスク・大型機能として限定的に検証予定 |
| Restricted | 同意、法務、権限、安全要件を満たした場合のみ提供予定 |

## 全体アーキテクチャフロー

ステータス: 開発中

```mermaid
flowchart LR
  Discord[Discord]
  Bot[apps/bot\nDiscord Bot]
  Dashboard[apps/dashboard\nWeb Dashboard]
  API[apps/api\nFastify API]
  Worker[apps/worker\nWorker]
  DB[(PostgreSQL\nPrisma)]
  Redis[(Redis)]
  Storage[(Object Storage)]
  Agent[Server Ops Agent\nPreview]
  Server[Target Server\nMinecraft/Web]

  Discord --> Bot
  Dashboard --> API
  Bot --> DB
  API --> DB
  Worker --> DB
  Worker --> Redis
  API --> Redis
  Worker --> Storage
  API -. Preview .-> Agent
  Agent -. Preview .-> Server
```

基本方針:

- Bot、Dashboard、API、Worker は同じDBを参照します。
- ギルド単位のデータ分離は `guildId` を起点に行います。
- 重い処理や定期処理は Worker / Queue へ逃がします。
- Server Ops は Bot 本体から直接実行せず、API、RBAC、承認、操作ポリシー、Agent を通します。

## ローカル起動フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant Docker as Docker Compose
  participant DB as PostgreSQL
  participant Redis as Redis
  participant MinIO as MinIO
  participant PNPM as pnpm workspace
  participant API as apps/api
  participant Bot as apps/bot

  Dev->>Docker: docker compose up -d
  Docker->>DB: PostgreSQL起動
  Docker->>Redis: Redis起動
  Docker->>MinIO: MinIO起動
  Dev->>PNPM: pnpm install
  Dev->>PNPM: pnpm --filter @lunaria/db db:generate
  Dev->>PNPM: pnpm --filter @lunaria/db db:dev
  Dev->>API: pnpm --filter @lunaria/api dev
  Dev->>Bot: pnpm --filter @lunaria/bot dev
```

注意:

- `.env` はコミットしません。
- Discord Bot を起動するには、Discord関連のSecretをローカル `.env` に設定します。
- AutoResponseなど Message Content を読む機能には、Discord Developer Portal で Message Content Intent の有効化が必要です。

## API health check フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant Client as Client
  participant API as apps/api

  Client->>API: GET /health
  API-->>Client: ok / service / timestamp
```

用途:

- ローカル起動確認
- デプロイ後の疎通確認
- 将来の監視・ステータスページ連携

## Discord Interaction フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant User as Discord User
  participant Discord as Discord
  participant Bot as apps/bot Client
  participant Command as Command Handler
  participant DB as Prisma / PostgreSQL

  User->>Discord: Slash Command / Context Menu / Button
  Discord->>Bot: interactionCreate
  Bot->>Command: commandName / customId で振り分け
  Command->>DB: 必要に応じて設定・データ取得
  Command-->>Discord: reply / editReply / deferReply
  Discord-->>User: 結果表示
```

振り分け方針:

- Chat Input Command は `interaction.commandName` で処理します。
- Message Context Menu はコンテキストメニュー名で処理します。
- Button は `customId` のprefixで処理します。
- 未知の interaction は無視し、不要なエラーを返しません。

## `/lunaria ping` フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant User as Discord User
  participant Bot as apps/bot
  participant Lunaria as lunariaCommand

  User->>Bot: /lunaria ping
  Bot->>Lunaria: subcommand = ping
  Lunaria-->>User: ephemeral reply: Lunaria is awake.
```

目的:

- Botの起動確認
- Discord Interaction の疎通確認
- コマンド登録確認

## Quote add フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant User as Discord User
  participant Bot as apps/bot
  participant QuoteCommand as quoteCommand
  participant RBAC as RBAC
  participant DiscordAPI as Discord API
  participant QuoteService as QuoteService
  participant DB as Prisma / PostgreSQL
  participant Renderer as Quote Card Renderer

  User->>Bot: /quote add message-url
  Bot->>QuoteCommand: interactionCreate
  QuoteCommand->>RBAC: quotes:create 判定
  RBAC-->>QuoteCommand: 許可/拒否
  QuoteCommand->>DiscordAPI: message-url のメッセージ取得
  DiscordAPI-->>QuoteCommand: source message
  QuoteCommand->>QuoteService: add quote
  QuoteService->>DB: Quote保存 / AuditLog記録
  QuoteCommand->>Renderer: Quote画像生成
  Renderer-->>QuoteCommand: PNG attachment
  QuoteCommand-->>User: Quote画像 + 操作ボタン
```

主なロジック:

- `guildId` が一致しないメッセージURLは登録しません。
- 表示可能な本文または画像がないメッセージはQuote化しません。
- 重複登録はDB制約で抑止し、既存Quoteでも画像生成は継続できます。
- 権限がない場合はメッセージ取得前に拒否します。

## Quote random フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant User as Discord User
  participant Bot as apps/bot
  participant QuoteCommand as quoteCommand
  participant QuoteService as QuoteService
  participant DB as Prisma / PostgreSQL
  participant Renderer as Quote Card Renderer

  User->>Bot: /quote random
  Bot->>QuoteCommand: interactionCreate
  QuoteCommand->>QuoteService: randomVisible(guildId)
  QuoteService->>DB: hiddenでないQuoteを抽選
  DB-->>QuoteService: QuoteRecord or null
  QuoteService-->>QuoteCommand: QuoteRecord or null
  QuoteCommand->>Renderer: Quote画像生成
  QuoteCommand-->>User: Quote画像 + 操作ボタン
```

Quoteが存在しない場合:

- ユーザーに「表示できるquoteがまだありません」と返します。
- 監査ログは不要です。

## Quote hide フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant User as Discord User
  participant Bot as apps/bot
  participant QuoteCommand as quoteCommand
  participant RBAC as RBAC
  participant QuoteService as QuoteService
  participant DB as Prisma / PostgreSQL

  User->>Bot: /quote hide quote-id
  Bot->>QuoteCommand: interactionCreate
  QuoteCommand->>RBAC: quotes:manage 判定
  RBAC-->>QuoteCommand: 許可/拒否
  QuoteCommand->>QuoteService: hide(guildId, quoteId, actor)
  QuoteService->>DB: hiddenAt更新 / AuditLog記録
  QuoteCommand-->>User: 非表示完了メッセージ
```

運用方針:

- 削除ではなく非表示を基本とします。
- 復元や削除は将来の管理UIで扱います。
- 誰が非表示にしたかは監査ログに残します。

## Quoteカード再生成ボタンフロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant User as Discord User
  participant Bot as apps/bot
  participant Button as Button Handler
  participant DiscordAPI as Discord API
  participant QuoteService as QuoteService
  participant Renderer as Quote Card Renderer

  User->>Bot: Quote背景/デザイン/アイコン位置ボタン
  Bot->>Button: customId解析
  Button->>DiscordAPI: 元メッセージ再取得
  Button->>QuoteService: add quote（重複時は継続）
  Button->>Renderer: 選択appearanceで画像再生成
  Button-->>User: editReplyで画像とボタンを更新
```

注意:

- `customId` には対象メッセージと表示設定が含まれます。
- Quoteが既に登録済みの場合も、画像の再生成は可能です。
- 権限のないユーザーは再生成できません。

## AutoResponse / messageCreate ルール処理フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant User as Discord User
  participant Discord as Discord
  participant Bot as apps/bot
  participant RuleLoader as Rule Loader
  participant RuleEngine as Rule Engine
  participant DB as Prisma / PostgreSQL
  participant Audit as Audit Log

  User->>Discord: メッセージ投稿
  Discord->>Bot: messageCreate
  Bot->>Bot: Bot自身/対象外メッセージを除外
  Bot->>RuleLoader: guildIdに紐づく有効Ruleを取得
  RuleLoader->>DB: Rule / PluginSetting取得
  DB-->>RuleLoader: 有効ルール
  RuleLoader->>RuleEngine: trigger/condition/action評価
  RuleEngine-->>Bot: reply action
  Bot-->>Discord: reply
  Bot->>Audit: ルール発火ログ
  Audit->>DB: AuditLog保存
```

主な条件:

- `guildId` が存在するメッセージのみ処理します。
- Message Content Intent がない場合、本文を使う条件は成立しません。
- Bot自身やBot同士の無限ループは抑止します。
- cooldown が設定されている場合、連続発火を抑制します。

## Dashboard AutoResponse 設定保存フロー

ステータス: 実装済み

```mermaid
sequenceDiagram
  participant Admin as Guild Admin
  participant Dashboard as apps/dashboard
  participant Route as API Route
  participant Validator as Validator
  participant DB as Prisma / PostgreSQL
  participant Audit as Audit Log

  Admin->>Dashboard: AutoResponse設定を編集
  Dashboard->>Route: POST /api/guilds/:guildId/autoresponse
  Route->>Validator: 入力検証
  Validator-->>Route: validated config
  Route->>DB: PluginSetting upsert
  Route->>DB: Rule upsert
  Route->>Audit: 設定変更ログ
  Audit->>DB: AuditLog保存
  Route-->>Dashboard: 保存結果
```

将来方針:

- 複数ルール対応時は、Ruleの作成・更新・削除を差分適用します。
- 設定履歴とロールバックを追加します。
- 保存後のBot反映はキャッシュ更新またはQueue通知に移行します。

## Audit Log 記録フロー

ステータス: 実装済み

```mermaid
flowchart TD
  Event[操作または自動処理] --> NeedAudit{監査対象か}
  NeedAudit -- No --> End[終了]
  NeedAudit -- Yes --> Build[actor / guildId / event / target / metadata を組み立て]
  Build --> Store[AuditLogをDBに保存]
  Store --> Dashboard[Dashboardから参照]
```

監査対象の例:

- Dashboard設定変更
- AutoResponseルール発火
- Quote作成
- Quote非表示
- 将来のModeration操作
- 将来のRecording操作
- 将来のServer Ops操作

## Recording フロー

ステータス: Restricted / 予定

```mermaid
sequenceDiagram
  participant Moderator as Moderator
  participant Bot as apps/bot
  participant Policy as Recording Policy
  participant VC as Voice Channel
  participant Storage as Encrypted Storage
  participant Worker as Worker
  participant Audit as Audit Log

  Moderator->>Bot: /record start
  Bot->>Policy: 録音ポリシーと権限を確認
  Policy-->>Bot: 許可/拒否
  Bot->>VC: 録音通知・同意確認
  VC-->>Bot: 参加者同意状態
  Bot->>Audit: recording.requested / started
  Bot->>Storage: 暗号化保存開始
  Moderator->>Bot: /record stop
  Bot->>Storage: 保存終了
  Bot->>Worker: 文字起こし/議事録ジョブ投入
  Worker->>Audit: transcription.completed
```

必須条件:

- 録音開始前の通知
- 同意または録音前提VCの明示
- 録音中の常時表示
- 保存期間
- 削除申請導線
- 暗号化
- 参加者/管理者のアクセス制御
- 監査ログ

このフローは未実装です。実装前に法務・プライバシー・Discord規約・保存設計を再確認します。

## Server Ops / Minecraft フロー

ステータス: Preview / 予定

```mermaid
sequenceDiagram
  participant Operator as Operator
  participant Dashboard as Dashboard / Discord Command
  participant API as apps/api
  participant RBAC as RBAC
  participant Approval as Approval Flow
  participant Policy as Command Policy
  participant Agent as Server Ops Agent
  participant Target as Minecraft / Web Server
  participant Audit as Audit Log

  Operator->>Dashboard: 操作申請
  Dashboard->>API: operation request
  API->>RBAC: 権限確認
  RBAC-->>API: 許可/拒否
  API->>Approval: 危険操作なら承認要求
  Approval-->>API: 承認/却下
  API->>Policy: 操作が許可リスト内か確認
  Policy-->>API: 許可/拒否
  API->>Agent: 署名付きジョブ送信
  Agent->>Target: 許可済み操作を実行
  Target-->>Agent: 実行結果
  Agent-->>API: result / logs
  API->>Audit: 操作履歴保存
```

禁止事項:

- Discordから任意のOS操作を直接実行できる設計にしない
- Botプロセスが対象サーバーへ直接操作を行う設計にしない
- 破壊的操作を承認なしで実行しない
- 実行履歴を残さない設計にしない

## ドキュメント更新ルール

以下を変更した場合、このドキュメントも更新します。

- 新しいDiscordコマンドを追加したとき
- 新しいDashboard APIを追加したとき
- Rule Engineの評価順序を変更したとき
- RBACやAudit Logの責務を変更したとき
- Recording / Server Ops / Billing のような高リスク機能の設計を変更したとき
