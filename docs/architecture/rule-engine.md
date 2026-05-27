# Rule Engine仕様

最終更新日: 2026-05-27

Rule Engineは、Lunariaの自動化を `trigger -> condition -> action` で表現する中核機能です。

## 基本構造

| 要素 | 内容 |
|---|---|
| trigger | 発火条件。例: `messageCreate`, `interactionCreate`, `scheduledTime` |
| condition | 成立条件。例: keyword, channel, role, time window |
| action | 実行内容。例: reply, add reaction, audit log |
| cooldown | 発火頻度制限 |
| priority | 評価順序 |
| enabled | 有効/無効 |

## 実装済みの主な用途

- AutoResponse v1
- messageCreateルール処理
- AuditLog記録

## 評価フロー

1. Discordイベントを受け取る
2. `guildId` を取得する
3. 有効なRuleをDBから取得する
4. triggerが一致するRuleだけに絞る
5. conditionを評価する
6. cooldownを確認する
7. actionを実行する
8. 必要に応じてAuditLogを記録する

## Loop Prevention

Bot自身やBot同士の投稿を対象にすると無限ループになる可能性があります。Bot投稿は原則としてRule評価対象外にします。

## 将来追加予定

- 複数条件のAND/OR
- action chain
- scheduledTime trigger
- manualTrigger
- Dashboard Rule Builder
- JSON/YAML export/import

## 注意

Message Content Intentがない場合、メッセージ本文を使うconditionは評価できません。Public Bot化を見据え、Slash CommandやButtonで代替できる導線を残します。
