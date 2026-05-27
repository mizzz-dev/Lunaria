# コマンド一覧

最終更新日: 2026-05-27

このドキュメントは、Lunaria の Discord Bot コマンド、コンテキストメニュー、Botが内部で扱うイベント、開発・運用コマンドを整理した一覧です。

ステータスの意味:

- 実装済み: develop ブランチ上で実装済み
- 開発中: 実装途中、または検証中
- 予定: 要件定義済みだが未実装
- Preview: 実験的に提供予定の高リスク/大型機能
- Restricted: 権限・同意・法務・安全要件を満たした環境でのみ提供予定

## Discord スラッシュコマンド

| コマンド | 概要 | 権限 | 対応プラグイン | ステータス | 備考 |
|---|---|---|---|---|---|
| `/lunaria ping` | Lunaria Bot の応答確認を行う | 全員 | Core | 実装済み | ephemeral で `Lunaria is awake.` を返す |
| `/quote add message-url:<url> [design] [theme] [icon-position]` | Discord メッセージURLを Quote として保存し、Quote画像を生成する | Quote作成権限 | Quote | 実装済み | `design`: anime/manga/neon/cinema、`theme`: black/white/color、`icon-position`: left/right |
| `/quote random [design] [theme] [icon-position]` | ギルド内の表示可能な Quote からランダムに1件表示する | 全員 | Quote | 実装済み | Quote画像として表示。デザイン・テーマ・アイコン位置を指定可能 |
| `/quote hide quote-id:<id>` | 保存済み Quote を非表示にする | Quote管理権限 | Quote | 実装済み | `quotes:manage` 相当の権限を想定。監査ログ対象 |
| `/lfg create` | 募集を作成する | 全員、ギルド設定に依存 | LFG | 予定 | ゲーム、雑談、作業通話、イベント募集に対応予定 |
| `/team split` | 参加者をチーム分けする | イベント運営者以上 | Team Split | 予定 | ランダム、人数指定、ランク/レート考慮に対応予定 |
| `/record start` | VC録音を開始する | 録音管理権限 | Recording | Restricted | 同意、通知、保存期間、削除導線、監査ログが必須 |
| `/record stop` | VC録音を停止する | 録音管理権限 | Recording | Restricted | 保存・文字起こし・議事録生成と連携予定 |
| `/music play` | 音楽を再生する | DJロールまたは設定依存 | Music | 予定 | 音源ごとにプラグイン分離予定 |
| `/minecraft start` | Minecraft Java Server を起動する | Server Ops権限 | Minecraft / Server Ops | Preview | Agent経由・承認フロー必須 |
| `/minecraft stop` | Minecraft Java Server を停止する | Server Ops権限 | Minecraft / Server Ops | Preview | Dashboard側で危険操作確認を想定 |
| `/server restart` | Webサーバーや外部サーバーを再起動する | Server Ops権限 | Server Ops | Preview | 任意shell実行は禁止。許可済み操作のみ |

## Discord コンテキストメニュー

| メニュー | 種別 | 概要 | 権限 | 対応プラグイン | ステータス | 備考 |
|---|---|---|---|---|---|---|
| `Quote画像を作成` | メッセージコンテキストメニュー | 選択したメッセージを Quote として保存し、Quote画像を生成する | Quote作成権限 | Quote | 実装済み | 画像のみのメッセージにも対応。生成後にボタンで表示調整可能 |

## Discord ボタン操作

| 操作 | 概要 | 権限 | 対応プラグイン | ステータス | 備考 |
|---|---|---|---|---|---|
| Quote背景切替 | Quote画像の背景テーマを黒/白/カラーに切り替える | Quote作成権限 | Quote | 実装済み | `quote-card` カスタムIDで処理 |
| Quoteデザイン切替 | Quote画像のデザインをアニメ/漫画/ネオン/シネマに切り替える | Quote作成権限 | Quote | 実装済み | 同じ元メッセージから再生成 |
| Quoteアイコン位置切替 | Quote画像のアイコン位置を左/右に切り替える | Quote作成権限 | Quote | 実装済み | 同じ元メッセージから再生成 |
| LFG参加 | 募集に参加する | 全員、設定依存 | LFG | 予定 | 参加/仮参加/辞退ボタンを予定 |
| 録音同意 | VC録音への同意を行う | VC参加者 | Recording | Restricted | 録音前提VCや同意フローで利用予定 |
| 危険操作承認 | Server Ops の危険操作を承認する | 承認者ロール | Server Ops | Preview | Minecraft停止・復元・再起動などで利用予定 |

## Bot内部イベント / 自動処理

| トリガー | 概要 | 対応機能 | ステータス | 備考 |
|---|---|---|---|---|
| `messageCreate` | メッセージ作成時にルールを評価する | AutoResponse / Rule Engine / Quote返信補助 | 実装済み | Message Content Intent が必要 |
| `interactionCreate` | スラッシュコマンド、コンテキストメニュー、ボタンを処理する | Core / Quote | 実装済み | Botクライアントで処理 |
| `scheduledTime` | 指定時刻に処理を実行する | Daily Content | 予定 | Worker / Job Queue と連携予定 |
| `guildMemberAdd` | 新規参加者に対する処理を行う | Moderation / Welcome / RBAC | 予定 | Guild Members Intent が必要になる可能性あり |
| `voiceStateUpdate` | VC参加/退出を検知する | Music / Recording / VC Analytics | 予定 | Voice関連機能で利用予定 |

## API / 開発確認用エンドポイント

| エンドポイント | 概要 | 権限 | ステータス | 備考 |
|---|---|---|---|---|
| `GET /health` | APIの起動状態を確認する | なし | 実装済み | `ok`, `service`, `timestamp` を返す |

## 開発・運用コマンド

| コマンド | 概要 | 対象 | ステータス | 備考 |
|---|---|---|---|---|
| `pnpm install` | 依存関係をインストールする | Monorepo | 実装済み | 初回セットアップで実行 |
| `docker compose up -d` | PostgreSQL / Redis などのローカル依存サービスを起動する | Infra | 実装済み | Docker Desktop 起動後に実行 |
| `pnpm --filter @lunaria/db db:generate` | Prisma Client を生成する | DB | 実装済み | schema変更後に実行 |
| `pnpm --filter @lunaria/db db:dev -- --name <name>` | 開発用マイグレーションを作成・適用する | DB | 実装済み | ローカル開発用 |
| `pnpm --filter @lunaria/db db:deploy` | マイグレーションを適用する | DB | 実装済み | 本番/検証環境向け |
| `pnpm --filter @lunaria/api dev` | APIを起動する | API | 実装済み | `http://localhost:4000/health` を確認 |
| `pnpm --filter @lunaria/bot dev` | Discord Botを起動する | Bot | 実装済み | `.env` にDiscord関連Secretが必要 |
| `pnpm typecheck` | TypeScript型検査を実行する | Monorepo | 実装済み | PR前の確認 |
| `pnpm build` | 各パッケージをビルドする | Monorepo | 実装済み | PR前の確認 |
| `pnpm test` | テストを実行する | Monorepo | 実装済み | PR前の確認 |

## 注意事項

- Message Content Intent を利用する機能は、Discord Developer Portal での有効化が必要です。
- Recording / Server Ops / Minecraft 操作は高リスク機能のため、実装時は必ずRBAC、承認、監査ログ、保存/削除ポリシーを含めます。
- 未実装コマンドは、要件定義上の予定であり、現在のBotに登録されているとは限りません。
