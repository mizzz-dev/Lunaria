# ドメインロジック

最終更新日: 2026-05-31

このドキュメントは、Lunaria の実装で守るべきドメインロジック、責務分離、データ境界、権限・監査・安全設計を整理します。

## 基本原則

Lunaria の機能は、以下の原則を守って実装します。

1. ギルド単位でデータと設定を分離する。
2. すべての機能はプラグインとして有効化・無効化できる設計にする。
3. 自動化は可能な限り `trigger -> condition -> action` のRuleとして表現する。
4. 権限が必要な操作は、処理前にRBACで判定する。
5. 重要操作はAudit Logに記録する。
6. 重い処理、再試行が必要な処理、外部API依存処理はWorkerに逃がす。
7. RecordingやServer Opsなどの高リスク機能は、通知、承認、保存期間、削除導線、監査ログを必須にする。

## マルチテナント分離

Lunaria は複数ギルドで利用される前提のため、主要データは `guildId` を持ちます。

対象例:

- PluginSetting
- Rule
- AuditLog
- Quote
- DailyContentDelivery
- GameAccount
- ServerAgent
- 将来のLFG、Event、Recording、Billing Entitlement

実装ルール:

- Dashboard APIは、URLの `guildId` と認証ユーザーの管理可能ギルドを照合します。
- Bot処理は、Discord eventから取得した `guildId` を必ず利用します。
- DB検索では、原則として `guildId` を条件に含めます。
- 別ギルドのメッセージURLやQuote IDは受け付けません。

悪い例:

```ts
await prisma.quote.findUnique({ where: { id: quoteId } });
```

良い例:

```ts
await prisma.quote.findFirst({ where: { id: quoteId, guildId } });
```

## RBAC

RBACは、Lunaria上の操作可否を決める権限制御です。

主なロール:

| ロール | 用途 |
|---|---|
| owner | ギルド所有者相当。全管理操作を許可 |
| admin | サーバー管理者相当。設定変更や管理操作を許可 |
| moderator | モデレーションやQuote管理など一部管理操作を許可 |
| event_manager | LFG、イベント、チーム分けを管理 |
| viewer | 一般閲覧者 |

権限例:

| 権限 | 用途 |
|---|---|
| `quotes:create` | Quote登録・Quote画像生成 |
| `quotes:manage` | Quote非表示・削除・管理 |
| `rules:manage` | Rule作成・編集 |
| `plugins:manage` | Plugin有効化・設定変更 |
| `audit:read` | Audit Log閲覧 |
| `server_ops:request` | Server Ops操作申請 |
| `server_ops:approve` | Server Ops承認 |
| `recording:manage` | 録音開始・停止管理 |

実装ルール:

- 破壊的操作や管理操作は、DB更新前に必ずRBAC判定します。
- 権限不足時は、対象データの取得前に拒否できる場合は先に拒否します。
- Discord側の権限だけに依存せず、Lunaria側の権限モデルに変換して判定します。

## Audit Log

Audit Logは、設定変更、重要操作、自動処理の発火を追跡するための記録です。

保存すべき情報:

| 項目 | 内容 |
|---|---|
| guildId | 対象ギルド |
| actor | 操作したユーザーまたはシステム |
| event | イベント名 |
| target | 対象リソース |
| metadata | 変更内容、理由、実行結果など |
| createdAt | 記録日時 |

イベント例:

| イベント | 用途 |
|---|---|
| `plugin.setting.updated` | プラグイン設定変更 |
| `rule.triggered` | Rule発火 |
| `quote.created` | Quote作成 |
| `quote.hidden` | Quote非表示 |
| `recording.started` | 録音開始 |
| `server_operation.requested` | Server Ops申請 |
| `server_operation.completed` | Server Ops完了 |

実装ルール:

- 重要操作は成功・失敗の両方を記録できる設計にします。
- 個人情報やSecretをmetadataに保存しません。
- 監査ログはあとからDashboardで検索・フィルタできる前提にします。

## PluginSetting

PluginSettingは、ギルド単位のプラグイン設定を保存します。

責務:

- プラグインの有効/無効
- 設定JSON
- 将来の設定バージョン管理
- Quota/Billing連携の土台

実装ルール:

- `pluginId + guildId` で一意に扱います。
- 設定JSONはPluginごとのスキーマで検証します。
- 設定変更時はAudit Logを記録します。
- 将来はConfig History / Rollbackと接続します。

## Rule

Ruleは、Lunariaの自動化を表す中心データです。

基本構造:

| 要素 | 内容 |
|---|---|
| trigger | いつ発火するか |
| condition | どの条件で成立するか |
| action | 成立時に何をするか |
| cooldown | 発火頻度制限 |
| enabled | 有効/無効 |
| guildId | 対象ギルド |
| pluginId | 所有プラグイン |

AutoResponse v1の例:

- trigger: `messageCreate`
- condition: `keyword`, `channel`, `cooldown`
- action: `reply`

実装ルール:

- Rule評価は副作用の少ないロジックとして設計します。
- Discord API呼び出しやDB保存は、Action実行層に分けます。
- Bot同士の無限ループを避けるため、Bot投稿は基本的に対象外にします。
- ルール発火時は必要に応じてAudit Logを残します。

## Quote

Quoteは、コミュニティ内の良い発言を資産化するためのデータです。

保存する主な情報:

| 項目 | 内容 |
|---|---|
| guildId | 対象ギルド |
| content | Quote本文 |
| sourceMessageId | 元メッセージID |
| sourceMessageUrl | 元メッセージURL |
| sourceAuthorId | 元投稿者Discord ID |
| sourceAuthorName | 元投稿者名 |
| sourceChannelId | 元チャンネルID |
| sourceChannelName | 元チャンネル名 |
| sourceCreatedAt | 元メッセージ投稿日時 |
| registeredByUserId | 登録者 |
| hiddenAt | 非表示日時 |

実装ルール:

- 元メッセージが同じQuoteは重複登録しません。
- ギルド外メッセージはQuote化しません。
- 削除ではなく非表示を基本とします。
- Quote作成・非表示は監査ログ対象です。
- 画像生成は表示用の派生処理であり、Quoteの正本はDB上のレコードです。

## Message Content Intent依存機能

以下はMessage Content Intentに依存します。

- AutoResponseのキーワード判定
- NGワード検知
- FAQ検知
- メッセージ本文を使うRule条件

実装ルール:

- Intentがない場合でも、Bot全体が停止しないようにします。
- スラッシュコマンド、ボタン、コンテキストメニューで代替できる導線を用意します。
- Public Bot化を見据え、Message Contentが不要な機能は独立して動くようにします。

## Dashboard API

Dashboard APIは、管理者操作を受け取り、DBと監査ログに反映する責務を持ちます。

実装ルール:

- 入力検証を必ず行います。
- `guildId` の権限確認を行います。
- DB更新とAudit Logを同じ操作単位で扱います。
- 将来的にはConfigRevisionを追加し、差分とロールバックを実装します。

## Worker / Queue

Workerは、即時応答に向かない処理を担当します。

対象例:

- Daily Content投稿
- Game API更新
- 画像生成の重い処理
- 文字起こし
- 議事録生成
- Billing同期
- Server Ops結果処理

実装ルール:

- Interactionは原則として短時間でackします。
- 再試行可能な処理はJob化します。
- 二重実行を避けるため、Jobにはidempotency keyを持たせる設計にします。
- 失敗時はAudit Logまたは運用ログに残します。

### Daily Content delivery

Daily Content の内部 scheduling foundation は、`PluginSetting` で検証済み設定を持ち、Worker が due job として template slot 単位の delivery を処理します。

- dedupe key は `guildId / scheduleId / targetDate / contentSlot` を含めます。
- 成功した delivery は retry や同一 job 再投入でも publish しません。
- 失敗した delivery は再試行可能な状態として保存し、次回処理で attempt を増やします。
- Worker は dedupe key を渡す injectable publisher を通して配信し、Discord の本番 transport は後続 Issue で idempotency 契約とともに接続します。
- 成功・失敗 audit には判別用 metadata のみを記録し、template 本文や transport error 本文を含めません。
- Worker の orchestration 境界は有効な `PluginSetting` の検証済み設定から、schedule の IANA timezone における対象日と投稿時刻を判定し、投稿時刻以後の同日再走査でも同一 dedupe key の job を列挙します。
- `processing` delivery の `updatedAt` は最終 claim 時刻として扱い、`DAILY_CONTENT_PROCESSING_STALE_AFTER_MS`（15分）を経過したものだけを guild scope の条件付き更新で再 claim します。成功済み delivery は recovery 対象にしません。
- Queue payload は `guildId` と `enqueuedAt`、必要に応じて `referenceTime` のみを持ち、template本文を含めません。
- BullMQ / Redis runtime は `apps/worker` の queue producer / processor 境界に閉じ込め、domain logic は mock queue / fake store で単体検証できる形にします。
- Queue processor の戻り値と運用ログは件数サマリのみを扱い、template本文、Secret、実エラー本文を含めません。
- この段階では repeatable production registration、本番Discord publisher、Dashboard/API設定画面は接続しません。

## 高リスク機能の制約

### Recording

RecordingはRestricted機能です。

必須要件:

- 録音開始前の明示通知
- 同意または録音前提VCの明示
- 録音中表示
- 保存期間
- 暗号化
- アクセス制御
- 削除申請導線
- 監査ログ

Recordingは、便利機能ではなく個人データを扱う機能として設計します。

### Server Ops / Minecraft

Server OpsはPreview機能です。

必須要件:

- Bot本体から直接対象サーバーを操作しない
- API、RBAC、承認、操作ポリシー、Agentを通す
- 許可済み操作のみ実行する
- 危険操作はDashboardまたは承認フロー必須にする
- 実行ログと監査ログを残す

### Billing

BillingはPublic Alpha前に整える予定機能です。

必須要件:

- Stripe連携のWebhook検証
- プランとEntitlementのDB保存
- Plugin quotaとの接続
- 課金状態に応じた機能制限
- 返金・キャンセル・支払い失敗時の状態管理

## 実装レビュー観点

PRレビューでは以下を確認します。

- `guildId` によるデータ分離が守られているか
- 権限判定がDB更新前に行われているか
- 重要操作にAudit Logがあるか
- Secretや個人データをログに出していないか
- Message Content Intent依存を明記しているか
- Recording / Server Ops / Billing の安全要件を満たしているか
- 予定機能を実装済みとして扱っていないか

## ドキュメント更新ルール

以下を変更した場合、このドキュメントも更新します。

- DBモデルの責務を変更したとき
- RBAC権限を追加・変更したとき
- Audit Logイベントを追加・変更したとき
- PluginSetting / Rule / Quote の構造を変更したとき
- WorkerやQueueの責務を変更したとき
- 高リスク機能の設計方針を変更したとき
