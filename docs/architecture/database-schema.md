# データベース設計

最終更新日: 2026-05-27

LunariaはPostgreSQL + Prismaを使い、ギルド単位の分離を基本にします。

## 基本方針

- Discord IDは文字列で保存する
- 主要テーブルは`guildId`を持つ
- 設定やRuleはJSONで保存し、アプリ側でスキーマ検証する
- 重要操作はAuditLogに残す
- 削除より非表示・無効化を優先する

## 主要モデル

| モデル | 役割 | ステータス |
|---|---|---|
| User | Discordユーザーの基本情報 | 実装済み |
| Guild | Discordギルド情報 | 実装済み |
| GuildMember | ギルド内メンバー状態 | 実装済み |
| PluginSetting | ギルド別プラグイン設定 | 実装済み |
| Rule | trigger/condition/actionの自動化定義 | 実装済み |
| AuditLog | 設定変更・操作・発火履歴 | 実装済み |
| Quote | 名言・引用データ | 実装済み |
| GameAccount | ゲームID連携 | 予定 |
| ServerAgent | Server Ops Agent登録 | Preview |

## guildId分離

DB検索では原則として`guildId`を条件に含めます。

```ts
await prisma.quote.findFirst({ where: { id: quoteId, guildId } });
```

`id`だけで検索すると、別ギルドのデータを参照する危険があります。

## マイグレーション運用

開発時:

```powershell
pnpm --filter @lunaria/db db:dev -- --name change_name
```

適用:

```powershell
pnpm --filter @lunaria/db db:deploy
```

PRではDB変更理由、影響範囲、戻し方を記載します。

## 取り扱いに注意する情報

Discord user ID、ゲームID、Quoteの元投稿者情報などは慎重に扱います。保存期間、削除導線、アクセス制御を設計時に明確にします。
