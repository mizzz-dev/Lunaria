# Rule作成ガイド

最終更新日: 2026-05-27

このガイドは、LunariaのRuleを設計・追加するときの指針です。

## Rule設計の考え方

Ruleは次の形で考えます。

```text
いつ起きるか -> どんな条件か -> 何をするか
```

例:

```json
{
  "trigger": "messageCreate",
  "conditions": [
    { "type": "keyword", "value": "初心者" }
  ],
  "actions": [
    { "type": "reply", "message": "FAQを確認してください" }
  ]
}
```

## 作成時の確認

- guildIdがあるか
- Pluginが有効か
- Message Content Intentが必要か
- cooldownが必要か
- Audit Logが必要か
- Botループを起こさないか

## Dashboard GUI化方針

将来的には、管理者が以下をGUIで選べるようにします。

- Trigger
- Condition
- Action
- Cooldown
- 対象チャンネル
- 対象ロール
- テスト実行

## 高リスクAction

Timeout、BAN、サーバー操作、録音開始などは通常のRule actionとして即時実行しません。RBAC、承認フロー、監査ログを必須にします。
