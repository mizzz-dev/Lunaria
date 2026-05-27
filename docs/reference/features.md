# 機能一覧

最終更新日: 2026-05-28

このドキュメントは、Lunaria が提供する機能をカテゴリ別に整理した機能カタログです。実装状況は [`feature-status.md`](./feature-status.md) を参照してください。

## Core Platform

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Discord Bot基盤 | discord.js v14を使ったBot実行基盤 | 実装済み | `/lunaria ping`、Quote、messageCreateルール処理を含む |
| API基盤 | FastifyベースのAPIサーバー | 実装済み | `GET /health` を提供 |
| Prisma DB基盤 | PostgreSQL永続化スキーマとPrisma Client | 実装済み | PluginSetting、Rule、AuditLog、Quoteなどを管理 |
| Rule Engine | `trigger -> condition -> action` の自動化基盤 | 実装済み | messageCreate系ルールが中心 |
| RBAC | Owner/Admin/Moderator/Viewerなどの権限制御 | 実装済み | Quote管理や将来の危険操作制御に利用 |
| Audit Log | 設定変更・ルール発火・重要操作を記録する監査基盤 | 実装済み | DB永続化とDashboard表示の土台あり |
| Plugin Settings | ギルドごとのプラグイン設定保存 | 実装済み | AutoResponseなどで利用 |
| Config History / Rollback | 設定履歴とロールバック | 予定 | 要件定義済み。詳細UIは未実装 |
| Template Marketplace | 運営テンプレートの共有・導入 | 予定 | 荒らし対策、募集、運営セットなどを想定 |

## Dashboard

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Dashboard Shell | Web管理画面の土台 | 実装済み | `apps/dashboard` に実装 |
| Guild Selector | 対象ギルド選択 | 実装済み | Discord OAuth連携と組み合わせて利用 |
| AutoResponse設定 | キーワード返信ルールの保存・管理 | 実装済み | API RouteとDashboard UIが存在 |
| Quote管理API | Quoteの作成・取得・非表示 | 実装済み | Dashboard APIとして提供 |
| Audit Log表示API | ギルド単位の監査ログ取得 | 実装済み | Dashboardでの表示用API |
| Plugin Store | プラグインの有効化/無効化UI | 予定 | Plugin Platformと連動予定 |
| Rule Builder | ルールエンジンのGUI編集 | 予定 | trigger/condition/actionをGUIで構成予定 |
| Theme設定 | ダーク/ライト/カスタムテーマ切替 | 予定 | デザイン方針として定義済み |
| Billing画面 | プラン・支払い・利用制限管理 | 予定 | Stripe連携後に実装予定 |

## Community

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Quote | 良い発言を保存し、ランダム表示や画像カード化を行う | 実装済み | `/quote add`, `/quote random`, `/quote hide`, メッセージコンテキストメニュー対応 |
| Quote画像カード | QuoteをOGP風の画像として生成する | 実装済み | sharpで生成。デザイン・背景・アイコン位置を切替可能 |
| AutoResponse | 特定キーワードに自動返信する | 実装済み | Dashboardから1つのキーワード返信ルールを保存可能 |
| Daily Content | 今日の名言、質問、ミッションなどを自動投稿する | 開発中 | 内部 scheduling / dedupe / audit 基盤のみ。本番投稿と設定UIは未実装 |
| Highlight / Summary | 人気投稿や週報を生成する | 予定 | AIやAnalyticsと連携予定 |
| Community Economy | ポイント、称号、交換要素 | 予定 | 不正対策が必要 |

## Moderation

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Basic Moderation | 招待リンク、NGワード、連投などを検知する | 予定 | Rule Engineと連携予定 |
| Auto Timeout | 条件に応じてTimeoutする | 予定 | RBACと監査ログ必須 |
| Moderation Audit | 警告・削除・Timeoutなどを記録する | 予定 | Audit Logに統合予定 |
| AI Moderation Assist | 危険度スコアや判定補助 | 予定 | 誤検知対策・人間確認必須 |

## LFG / Events

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| LFG | ゲーム、雑談、作業通話、イベント募集を作成する | 予定 | `/lfg create` を想定 |
| LFG参加ボタン | 参加/仮参加/辞退ボタン | 予定 | 満員時自動クローズ予定 |
| Event Management | イベント作成、参加管理、リマインド | 予定 | DiscordイベントやVCと連携予定 |
| Team Split | 参加者をランダム/条件付きでチーム分け | 予定 | ランク/レート考慮はゲーム連携後 |

## Game Integration

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Game Profile | DiscordユーザーとゲームIDを紐付ける | 予定 | 公開範囲設定が必要 |
| VALORANT連携 | ランク、戦績、LFG連携 | 予定 | Riot APIポリシー準拠必須 |
| League of Legends連携 | ランク、戦績、熟練度 | 予定 | Riot APIポリシー準拠必須 |
| Genshin / HSR連携 | UID公開ショーケースベースのビルド表示 | 予定 | UIDは個人データとして扱う |
| Minecraft Profile | Minecraft Javaサーバー連携用プロフィール | 予定 | Server Opsと連動予定 |

## Music / Voice

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Music再生 | VCで音楽を再生する | 予定 | 音源ごとにプラグイン分離予定 |
| Queue管理 | 再生キュー、skip、now playing | 予定 | DJロール/投票skipを想定 |
| VC Analytics | VC利用時間や参加状況の分析 | 予定 | Guild Voice States Intentが必要 |

## Recording

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| VC録音 | VCの音声を録音する | Restricted | 同意、通知、保存期間、削除導線、暗号化が必須 |
| 文字起こし | 録音音声を文字起こしする | Restricted | 日本語対応を想定 |
| 議事録生成 | 要約、ToDo抽出、共有 | Restricted | AI Provider抽象化後に実装予定 |

## Minecraft / Server Ops

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Minecraft Java管理 | 起動、停止、再起動、バックアップ、ホワイトリスト管理 | Preview | Server Ops Agent経由のみ |
| Server Ops Agent | 対象サーバーで安全に操作を実行するAgent | Preview | Bot本体から直接shell実行しない |
| Command Policy | 実行可能操作の許可リスト制御 | Preview | 任意shell commandは禁止 |
| Approval Flow | 危険操作の承認フロー | Preview | DashboardとDiscordボタンで利用予定 |
| Execution Log | サーバー操作の実行履歴 | Preview | 監査ログとセットで保存予定 |

## Billing / Marketplace

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| Stripe Billing | サーバー単位/月額課金 | 予定 | Public Alpha前に実装予定 |
| Plan Limit | プラグイン数、ルール数、保存容量、AI利用量などの制限 | 予定 | Plugin capability / quotaと連携予定 |
| Template Marketplace | 運営テンプレートを共有するマーケット | 予定 | Free/Proテンプレートを想定 |
| Custom Bot | サーバーごとの専用Bot提供 | 予定 | v2以降を想定 |

## AI Features

| 機能 | 概要 | ステータス | 備考 |
|---|---|---|---|
| AI Provider抽象化 | OpenAI/Claude/Geminiなどを差し替え可能にする | 予定 | Provider interfaceを分離予定 |
| FAQ生成 | 会話や記事からFAQ下書きを生成する | 予定 | 人間レビュー前提 |
| 運営レポート | 週報、ハイライト、荒れ指標を生成する | 予定 | Analyticsと連携予定 |
| AI議事録 | 録音/文字起こしから要約・ToDo抽出 | Restricted | Recording要件を満たした場合のみ |
