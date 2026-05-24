# Lunaria Product Requirements v0.1

最終更新日: 2026-05-24

## 1. 概要

Lunaria は、ゲームコミュニティ向けの Discord Bot と Web Dashboard である。
初期段階では身内サーバー向けに運用し、将来的に公開 Bot、サーバーごとの Custom Bot、課金、AI 機能、ゲーム連携、録音、Web/Minecraft サーバー操作まで拡張できる設計にする。

目標は MEE6 のようなプラグイン型 Discord 運営基盤を超え、ゲームコミュニティの日常運営、募集、イベント、ハイライト、AI 補助、サーバー運用を一つの体験に統合することである。

## 2. 対象ユーザー

### 2.1 初期対象

- ゲームコミュニティの身内 Discord サーバー
- 初期接続 guild id: `964326043420872704`
- サーバー管理者
- モデレーター
- イベント運営者
- LFG/募集をよく使う一般メンバー

### 2.2 将来対象

- 複数ゲームを扱う中規模コミュニティ
- 配信者コミュニティ
- 公開 Bot として利用する外部ギルド
- Custom Bot を求める有料ギルド

## 3. プロダクト原則

1. すべての機能は Plugin として追加、削除、有効化、無効化できる。
2. すべての自動化は Rule Engine の `trigger -> condition -> action` で表現できる。
3. 設定変更は Dashboard から行い、監査ログ、履歴、差分、ロールバックを残す。
4. ギルドごとに設定とデータを分離する。
5. 危険な操作は承認フロー、権限、監査ログ、実行履歴を必須にする。
6. 録音、AI、外部 API、サーバー操作は同意、規約、セキュリティを要件に含める。
7. MVP では小さく動く範囲を優先し、後から大型機能を追加できる設計を守る。

## 4. MVP スコープ

初期 MVP は「ゲームコミュニティ運営が毎日使う機能」と「将来拡張の土台」を優先する。

### 4.1 MVP に入れる機能

1. Core Platform
   - Discord Bot 基盤
   - Dashboard 基盤
   - Discord OAuth2 ログイン
   - ギルド選択
   - 管理権限チェック

2. Plugin System v1
   - プラグインの登録
   - ギルド単位の有効化/無効化
   - JSON Schema による設定定義
   - プラグイン依存関係
   - 利用制限と将来課金用メタデータ

3. RBAC and Audit Log
   - Owner/Admin/Moderator/Event Manager/Viewer
   - 設定変更ログ
   - コマンド実行ログ
   - 重要操作ログ

4. Rule Engine v1
   - Discord event trigger
   - schedule trigger
   - condition evaluation
   - action execution
   - cooldown
   - loop prevention

5. Community Plugins v1
   - AutoResponse
   - Quote
   - Daily Content
   - LFG basic
   - Moderation basic

### 4.2 MVP で後回しにする機能

- 録音と文字起こし
- 音楽再生
- Riot 連携
- HoYo 連携
- AI モデレーション
- AI FAQ 生成
- Minecraft/Web サーバー操作
- Custom Bot の本番提供
- 課金決済

ただし、後回しにする機能も Plugin System、RBAC、Audit Log、Rule Engine、Job Queue の設計には最初から接続可能にしておく。

## 5. 機能要件

### 5.1 Plugin System

各プラグインは次のメタデータを持つ。

- plugin id
- display name
- description
- version
- category
- config schema
- required permissions
- audit event definitions
- quota definitions
- billing capability definitions
- dependencies
- supported triggers
- supported actions

ギルドごとに次を管理する。

- enabled/disabled
- config
- config version
- feature flags
- quota usage
- billing entitlement

### 5.2 Rule Engine

Rule は次の構造を持つ。

- trigger
- conditions
- actions
- cooldown
- priority
- enabled
- guild scope
- plugin owner
- audit policy

MVP で対応する trigger:

- messageCreate
- interactionCreate
- guildMemberAdd
- scheduledTime

MVP で対応する condition:

- channel match
- role match
- keyword match
- regex match
- time window
- user cooldown
- plugin enabled

MVP で対応する action:

- reply
- send embed
- add reaction
- assign role
- create thread
- write audit log

### 5.3 Dashboard

Dashboard は日本語と英語に対応する。デフォルトテーマは dark、light theme も提供する。
候補ドメインは `ivRm.jp` とする。
`ivRm.jp` はこれから取得する前提で、取得後に DNS、TLS、Dashboard 公開構成を決定する。

必須画面:

- login
- guild selector
- overview
- plugins
- plugin settings
- rules
- audit logs
- config history
- rollback
- members and RBAC
- templates

デザイン方針:

- Meta/Apple のように余白、透明感、滑らかな操作感を重視する
- 管理画面として情報密度と操作速度を犠牲にしない
- dark theme を標準にし、アクセントカラーは Lunaria のキャラクター/ブランド設計後に確定する
- ブランドは氷、宇宙、月、少女/人形をモチーフにした独自キャラクターを中心にする
- 参考イメージは Honkai: Star Rail のヘルタ系の雰囲気だが、キャラクター、衣装、ロゴ、固有表現は直接複製しない
- mobile でも確認や軽微な操作ができる

### 5.4 Quote Plugin

- message context command から quote 登録
- slash command から quote 登録
- message url, author, channel, timestamp を保存
- `/quote random`
- `/quote list`
- `/quote top`
- tag/category
- hide/delete/report
- audit log

画像カード生成は v2 以降に回す。

### 5.5 Daily Content Plugin

- ギルドごとの投稿時刻
- 投稿チャンネル設定
- 今日の名言
- 今日の質問
- 今日のミッション
- テンプレ変数
- 重複防止
- 失敗時リトライ

### 5.6 AutoResponse Plugin

- keyword
- regex
- channel condition
- role condition
- time condition
- reply action
- reaction action
- thread action
- cooldown
- bot loop prevention
- random response variants

### 5.7 LFG Plugin

- `/lfg create`
- title
- game
- start time
- capacity
- requirements
- join/maybe/leave buttons
- auto close when full
- thread creation
- spam cooldown

v2 以降で game profile、rank、team split と統合する。

### 5.8 Moderation Basic Plugin

- invite link detection
- blocked word detection
- spam detection
- new account / new member restriction
- warn/delete/timeout actions
- moderation audit log

AI 補助は v2 以降。

## 6. 将来機能

### 6.1 Game Integrations

Riot 系は公式 Developer Portal とポリシー遵守を前提にする。

- VALORANT store
- VALORANT match/rank
- League of Legends match/rank/mastery
- LFG rank auto tag
- team split balancing

HoYo 系は公開ショーケース/公開情報ベースに限定する。

- Genshin UID link
- Genshin build/score
- HSR relic score
- privacy setting
- UID deletion

### 6.2 Recording

録音機能は必ず同意取得、通知、保存期間、削除導線、暗号化、アクセス制御を要件にする。

- `/record start`
- all participant consent
- visible recording status
- `/record stop`
- encrypted storage
- retention policy
- transcript
- meeting summary
- ToDo extraction

### 6.3 AI Features

複数 AI provider に対応する。

- OpenAI
- Claude
- Gemini

最初の実装 provider は OpenAI を第一候補にする。
ただし provider interface は最初から分離し、Claude と Gemini を後から追加できる形にする。

AI 機能:

- moderation risk scoring
- FAQ draft generation
- meeting summary
- operation report
- weekly highlights
- template generation

provider は抽象化し、ギルド/プラン/機能ごとに利用可否と quota を管理する。

### 6.4 Server Operations

Web server と Minecraft server の操作は、Bot から直接 shell 実行しない。
専用 Agent と Job Queue を通し、承認フロー付きで実行する。

対象操作:

- start
- stop
- restart
- log tail
- backup
- restore
- deploy
- plugin update
- config edit
- health check
- SSH operation

すべての操作に次を必須とする。

- RBAC
- approval workflow
- dry run where possible
- audit log
- execution log
- timeout
- rollback or recovery instruction

## 7. 課金設計

MVP では決済を実装しないが、設計には入れる。

想定プラン:

- Free/Internal
- Guild Pro
- Guild Premium
- User Pro

課金軸:

- guild based entitlement
- user based entitlement
- plugin access
- quota increase
- custom bot
- AI usage
- storage usage

課金境界は Plugin System の capability と quota に紐付ける。

Custom Bot は v2 以降の提供に回す。
ただし v1 の DB/設定設計では `bot_instances` を想定し、後からサーバーごとの専用 Bot に拡張できる余地を残す。

## 8. 非機能要件

### 8.1 Performance

- Dashboard 設定変更は 60 秒以内に Bot へ反映
- Discord interaction は原則 3 秒以内に ack
- 重い処理は queue へ逃がす

### 8.2 Security

- secret は環境変数または secrets manager
- guild data isolation
- RBAC enforcement
- audit log is append-only
- server operations are never direct by default
- recording data is encrypted

### 8.3 Reliability

- queue retry
- idempotency key
- scheduled job duplicate prevention
- plugin failure isolation
- structured logging

### 8.4 Compliance

- Discord Developer Terms
- Riot Developer policy
- HoYo public data only
- recording consent and retention
- privacy deletion request

## 9. Open Questions

次に決める必要がある。

1. `ivRm.jp` の DNS/ホスティング構成
2. AWS を使う場合に月額 2,000 円以内で収める構成
3. Lunaria のモチーフキャラ、ロゴ、テーマカラーの詳細
4. OpenAI API 利用開始時のキー管理方式
5. Linear workspace `ivRm` 内の project/label/status 構成
