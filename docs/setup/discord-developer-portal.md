# Discord Developer Portal設定

最終更新日: 2026-05-27

Lunaria Botを開発・検証するためのDiscord Developer Portal設定手順です。

## Application作成

1. Discord Developer Portalを開く
2. New Applicationを作成する
3. 名前を `Lunaria` にする
4. Application IDを `.env` の `DISCORD_CLIENT_ID` に設定する

## Bot設定

1. Botタブを開く
2. Botを作成する
3. Tokenを発行し、`.env` の `DISCORD_BOT_TOKEN` に設定する
4. Tokenは絶対にGitへコミットしない

## OAuth2設定

Dashboard OAuthで使う場合:

- `identify`
- `guilds`

Bot招待で使う場合:

- `bot`
- `applications.commands`

開発用招待URLテンプレート:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147486720&scope=bot%20applications.commands
```

## Redirect URI

Dashboard OAuthを使う場合は、OAuth2 Redirectsに以下のようなURIを登録します。

```text
http://localhost:3000/api/auth/callback/discord
```

実際の実装に合わせて `DISCORD_REDIRECT_URI` と一致させます。

## Privileged Gateway Intents

Lunariaで利用予定のIntent:

| Intent | 用途 | 状態 |
|---|---|---|
| Message Content Intent | AutoResponse、NGワード、FAQ検知 | 必要 |
| Server Members Intent | メンバー参加/離脱、ロール同期 | 将来必要 |
| Presence Intent | 現時点では不要 | 原則使わない |

Message Content Intentがない場合、本文を読むRuleは動作しません。Bot全体は停止させず、スラッシュコマンドやボタン中心の導線を残します。

## Guild Command登録

開発中はGuild単位のコマンド登録を推奨します。

- 反映が速い
- テストギルドで検証しやすい
- 公開前の誤登録を避けやすい

## Missing Access対処

`Missing Access` が出る場合:

- Botが対象ギルドに参加しているか確認
- `applications.commands` scopeで招待しているか確認
- Botに必要権限があるか確認
- `DISCORD_GUILD_ID` が正しいか確認

## セキュリティ注意

- Bot Tokenはパスワード相当として扱う
- OAuth SecretをIssue/PR/ログに書かない
- 公開Bot化する前にIntentと権限を最小化する
