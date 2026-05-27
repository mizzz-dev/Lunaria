# トラブルシューティング

最終更新日: 2026-05-27

Lunariaのローカル開発で起きやすい問題と対処をまとめます。

## Dockerが起動していない

`docker compose up -d` が失敗する場合は、Docker DesktopまたはDocker Engineが起動しているか確認します。WindowsではWSL2バックエンドの起動完了まで待ってから再実行します。

## ポート競合

PostgreSQLの`5432`、Redisの`6379`、MinIOの`9000/9001`が他プロセスで使われている場合は、既存プロセスを止めるかローカル設定のポートを変更します。

## Prisma Clientがない

```powershell
pnpm --filter @lunaria/db db:generate
```

DB接続に失敗する場合は、`docker compose ps`でPostgreSQLの状態を確認します。

## Botが起動しない

確認項目:

- `.env` がリポジトリrootにある
- Discord関連の環境変数が設定されている
- `pnpm --filter @lunaria/bot dev` を実行している
- Botを対象ギルドに招待済み

## コマンドが表示されない

確認項目:

- `applications.commands` scope付きでBotを招待している
- Guild command登録が成功している
- 対象ギルドIDが正しい
- Discordクライアントを再起動している

## Missing Access

Botの招待scope、対象ギルド、Bot権限、チャンネル閲覧権限を確認します。

## AutoResponseが反応しない

確認項目:

- Message Content Intentが有効
- Botが対象チャンネルを読める
- AutoResponse設定が保存済み
- Ruleが有効
- cooldown中ではない

## テストが落ちる

```powershell
pnpm install
pnpm --filter @lunaria/db db:generate
pnpm test
```

生成物や依存関係が不足している場合があります。

## 機密値を誤って含めた

実値を無効化し、新しい値へ差し替えます。PR、Issue、ログ、スクリーンショットにも残っていないか確認します。

## ドキュメントと実装がずれている

実装変更時は、関連する`docs/reference`、`docs/architecture`、`docs/setup`も更新します。
