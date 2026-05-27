# Botコマンド追加ガイド

最終更新日: 2026-05-27

このガイドは、Lunaria BotにDiscordコマンドを追加するときの実装ルールです。

## 基本方針

- discord.js v14を使う
- 1コマンド1責務を守る
- 権限チェックを先に行う
- 重い処理は`deferReply`またはWorkerへ逃がす
- 重要操作はAuditLogに残す
- コマンド追加時は`docs/reference/commands.md`も更新する

## 実装手順

1. `apps/bot/src/commands` にコマンドファイルを追加する
2. `commands/index.ts` に登録する
3. 必要なserviceやDBアクセスを分離する
4. テストを追加する
5. コマンド登録を実行する
6. READMEまたは関連ドキュメントを更新する

## Reply方針

| 種類 | 使い方 |
|---|---|
| `reply` | 軽い処理 |
| `deferReply` | DB/API/画像生成など時間がかかる処理 |
| `editReply` | defer後の結果返却 |
| ephemeral | 権限エラー、確認、管理操作 |

## エラー方針

- ユーザー向けには短く分かりやすく返す
- 詳細はログに出す
- SecretやTokenはログに出さない

## 人間レビュー必須

以下を含むコマンドは人間レビュー必須です。

- 権限変更
- Timeout/BAN/Kick
- 録音
- Server Ops
- Minecraft操作
- 課金
- 個人データ操作
