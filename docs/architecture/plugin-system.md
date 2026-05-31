# Plugin System仕様

最終更新日: 2026-05-31

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

第二段階では、有効な `PluginSetting` から schedule の timezone と投稿時刻に基づいて due job を列挙し、`processing` の最終 claim から15分経過した delivery のみを同じ dedupe key で recovery できる内部境界を追加します。

第三段階では、`apps/worker` に Daily Content 専用の BullMQ queue producer / worker processor 境界を追加します。queue payload は `guildId` と基準時刻のみを持ち、worker processor が orchestration 境界へ処理を委譲します。本番Discord publisher、repeatable production registration、Dashboard/API設定画面は引き続き後続 Issue とします。
