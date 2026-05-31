# 機能ステータス

最終更新日: 2026-05-31

このドキュメントは、Lunaria の機能を実装状況別に整理するための一覧です。

## ステータス定義

| ステータス | 意味 |
|---|---|
| 実装済み | develop ブランチ上に実装が存在し、基本的な動作確認対象になっている |
| 開発中 | 実装途中、検証中、またはUI/APIの一部のみ存在する |
| 予定 | 要件定義済みだが、まだ実装されていない |
| Preview | 高リスクまたは大型機能のため、限定的・実験的に提供予定 |
| Restricted | 法務・同意・権限・安全要件を満たした環境でのみ提供予定 |

## 実装済み

| 機能 | カテゴリ | 関連コマンド/画面 | 備考 |
|---|---|---|---|
| Discord Bot起動基盤 | Core Platform | `pnpm --filter @lunaria/bot dev` | discord.js v14ベース |
| `/lunaria ping` | Bot | `/lunaria ping` | Bot応答確認用 |
| API health check | API | `GET /health` | API起動確認用 |
| Prisma DB基盤 | Core Platform | `pnpm --filter @lunaria/db db:*` | PostgreSQL / Prisma |
| Rule Engine messageCreate基盤 | Core Platform | `messageCreate` | AutoResponse系ルール処理に利用 |
| PluginSetting保存 | Core Platform | Dashboard API | ギルド別プラグイン設定 |
| Audit Log基盤 | Core Platform | Dashboard API | 設定変更・ルール発火などを記録 |
| RBAC基盤 | Core Platform | Quote管理など | Owner/Admin/Moderator/Viewer系の権限制御 |
| AutoResponse v1 | Community | Dashboard / `messageCreate` | 1つのキーワード返信ルールを保存可能 |
| Quote v1 | Community | `/quote add`, `/quote random`, `/quote hide` | Quote保存・非表示・ランダム表示 |
| Quote画像カード | Community | `/quote`, メッセージコンテキストメニュー | sharpで画像生成 |
| Quoteメッセージコンテキストメニュー | Community | `Quote画像を作成` | 右クリックからQuote画像を作成 |
| Quoteカード表示切替ボタン | Community | Discord Button | 背景/デザイン/アイコン位置の切替 |
| Dashboard Shell | Dashboard | `apps/dashboard` | 初期UIとAPI Routeあり |
| Guild Selector | Dashboard | Dashboard | Discord OAuth前提のギルド選択UI |
| Quote管理API | Dashboard | `/api/guilds/[guildId]/quotes` | Quote取得・作成・非表示 |
| AutoResponse設定API | Dashboard | `/api/guilds/[guildId]/autoresponse` | AutoResponse設定保存 |
| Audit Log取得API | Dashboard | `/api/guilds/[guildId]/audit-logs` | 監査ログ表示用 |

## 開発中

| 機能 | カテゴリ | 現状 | 次の作業 |
|---|---|---|---|
| Dashboardの実運用UI | Dashboard | 初期Shellと一部APIあり | Plugin Store / Rule Builder / RBAC UI を拡張 |
| AutoResponse複数ルール対応 | Community | 1ルール中心 | ルール一覧・複数ルール編集・A/B返信対応 |
| Audit Stream | Dashboard | 監査ログ取得APIあり | UI表示・フィルタ・差分表示を強化 |
| Quote管理UI | Dashboard | APIあり | 一覧、非表示、検索、タグ管理UIを追加 |
| Daily Content scheduling / queue runner | Community / Worker | 設定schema、timezone due列挙、delivery dedupe / stale recovery、BullMQ queue producer / worker processor境界を実装 | 本番Discord publisher、repeatable登録、設定UIを別Issueで追加 |
| ドキュメント整備 | Documentation | READMEと要件文書あり | コマンド一覧・機能一覧・セットアップを継続更新 |

## 予定

| 機能 | カテゴリ | 概要 | 備考 |
|---|---|---|---|
| Plugin Store | Dashboard | プラグイン有効化/無効化UI | SaaS/セルフホスト両対応を想定 |
| Rule Builder | Dashboard | trigger/condition/actionをGUI編集 | Rule Engineと連携 |
| Config History / Rollback | Core Platform | 設定履歴、差分、ロールバック | 監査ログと連携 |
| LFG | LFG / Events | 募集作成、参加、仮参加、辞退 | `/lfg create`予定 |
| Team Split | LFG / Events | ランダム/条件付きチーム分け | ゲーム連携後にランク考慮 |
| Community Events | LFG / Events | イベント作成、参加管理、リマインド | Discordイベント/VC連携予定 |
| Basic Moderation | Moderation | NGワード、招待リンク、連投検知 | Message Content Intent依存 |
| Game Profile | Game Integration | DiscordユーザーとゲームID紐付け | 公開範囲設定が必要 |
| VALORANT連携 | Game Integration | ランク、戦績、LFG連携 | Riot APIポリシー準拠必須 |
| League of Legends連携 | Game Integration | ランク、戦績、熟練度 | Riot APIポリシー準拠必須 |
| Genshin / HSR連携 | Game Integration | UID公開ショーケースベースの表示 | UID削除導線が必要 |
| Music | Music / Voice | VC音楽再生 | 音源プラグイン分離予定 |
| Billing | Billing | Stripe月額/サーバー単位課金 | Public Alpha前に検討 |
| Template Marketplace | Marketplace | 運営テンプレート共有 | 荒らし対策、募集、運営セット |
| AI Provider抽象化 | AI | OpenAI/Claude/Gemini対応 | Quota/Plan連携予定 |

## Preview

| 機能 | カテゴリ | 概要 | 必須条件 |
|---|---|---|---|
| Minecraft Java管理 | Minecraft / Server Ops | 起動、停止、再起動、バックアップ、ホワイトリスト管理 | Agent経由、RBAC、承認、監査ログ |
| Server Ops Agent | Server Ops | 対象サーバーで安全に操作を実行するAgent | 署名付き通信、操作ポリシー、実行ログ |
| Webサーバー操作 | Server Ops | restart、deploy、backup、health check | 許可リスト制 |
| 危険操作承認フロー | Server Ops | サーバー停止や復元などの承認 | Dashboard/Discord Button連携 |

## Restricted

| 機能 | カテゴリ | 概要 | 必須条件 |
|---|---|---|---|
| VC録音 | Recording | VC音声を録音する | 同意、通知、録音中表示、暗号化、保存期間、削除導線 |
| 文字起こし | Recording / AI | 録音音声を文字起こしする | アクセス制御、保存期間、AI Provider設定 |
| 議事録生成 | Recording / AI | 要約、ToDo抽出、共有 | 録音ポリシー、監査ログ、人間レビュー |
| AI Moderation Assist | AI / Moderation | 危険度スコアや判定補助 | 誤検知対策、管理者確認、ログ透明性 |

## 次に更新するタイミング

以下のタイミングでこのドキュメントを更新してください。

- 新しいDiscordコマンドを追加したとき
- Dashboardに新しい画面/APIを追加したとき
- プラグインのステータスが変わったとき
- Recording / Server Ops / Billing のような高リスク機能の設計を更新したとき
- Public Alphaに向けて機能の公開範囲を変更したとき
