# RBAC / Audit Log ポリシー

最終更新日: 2026-05-27

Lunariaでは、管理操作と高リスク操作をRBACで制御し、重要な操作をAudit Logに残します。

## RBACの目的

- 管理者、モデレーター、イベント運営者、閲覧者の責務を分ける
- Discord権限だけに依存しない
- Pluginごとに必要権限を定義する
- 危険操作を実行前に止められるようにする

## 権限例

| 権限 | 用途 |
|---|---|
| `plugins:manage` | Plugin設定変更 |
| `rules:manage` | Rule作成・編集 |
| `quotes:create` | Quote登録 |
| `quotes:manage` | Quote非表示・削除 |
| `audit:read` | Audit Log閲覧 |
| `recording:manage` | 録音管理 |
| `server_ops:request` | Server Ops申請 |
| `server_ops:approve` | Server Ops承認 |

## Audit Log対象

- Plugin設定変更
- Rule作成・更新・削除
- Quote作成・非表示
- モデレーション操作
- 録音開始・停止
- Server Ops申請・承認・実行
- 課金・プラン変更

## 実装ルール

- DB更新前に権限を確認する
- 操作結果をAudit Logに残す
- Secretや不要な個人情報をmetadataに保存しない
- 失敗も必要に応じて記録する
