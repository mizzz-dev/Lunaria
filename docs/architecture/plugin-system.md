# Plugin System仕様

最終更新日: 2026-05-28

Lunariaの機能はPlugin単位で管理します。PluginはSaaS版とセルフホスト版の両方で扱えることを前提にします。

## 目的

- 機能を有効化/無効化しやすくする
- ギルド単位で設定を分離する
- RBAC、Audit Log、Quota、Billingを機能ごとに接続する
- 将来の外部Plugin SDKへ拡張できるようにする

## PluginManifest

Pluginは以下の情報を持ちます。

| 項目 | 内容 |
|---|---|
| id | 一意なPlugin ID |
| name | 表示名 |
| version | バージョン |
| category | community / moderation / game / voice / ops など |
| configSchema | 設定スキーマ |
| defaultConfig | 初期設定 |
| requiredPermissions | Discord権限 |
| requiredIntents | 必要Intent |
| rbacPermissions | Lunaria内権限 |
| auditEvents | 監査イベント |
| dependencies | 依存Plugin |
| quota | 利用制限 |
| billing | 将来の課金境界 |

## ギルド別設定

`PluginSetting`で以下を管理します。

- enabled / disabled
- config JSON
- updatedBy
- updatedAt
- 将来のconfig revision

## 公式Plugin

| Plugin | ステータス |
|---|---|
| Core | 実装済み |
| Quote | 実装済み |
| AutoResponse | 実装済み |
| Daily Content | 開発中（scheduling / delivery基盤） |
| LFG | 予定 |
| Moderation | 予定 |
| Music | 予定 |
| Recording | Restricted |
| Minecraft / Server Ops | Preview |

## 実装ルール

- Plugin設定変更時はAudit Logを記録する
- Message Content Intentが必要なPluginは明記する
- 危険操作を含むPluginはRBACと承認フローを必須にする
- 未実装Pluginを実装済みとして扱わない

## Daily Content scheduling foundation

`Daily Content` の第一段階では、ギルド別設定を既存の `PluginSetting` に保存し、`channelId`、IANA timezone、投稿時刻、設定済み template / content slot を検証します。

Worker は `DailyContentDelivery` の dedupe key を使い、同一 `guildId / scheduleId / targetDate / contentSlot` の成功済み配信を再 publish しません。実際の Discord 投稿 transport と設定 UI は本段階には含めません。
