# Dashboard開発ガイド

最終更新日: 2026-05-27

このガイドは、Lunaria Dashboardを開発するときの設計・実装ルールです。

## 基本方針

- ゲームコミュニティ運営者が迷わず使えるUIにする
- guildIdを常に意識する
- 設定変更はAuditLogに残す
- 入力検証を必ず行う
- モバイルでも確認・軽微な操作ができるようにする
- UI変更時はPRにスクリーンショットを添付する

## 画面カテゴリ

| 画面 | 用途 | ステータス |
|---|---|---|
| Guild Selector | 対象ギルド選択 | 実装済み |
| Overview | 状況確認 | 開発中 |
| AutoResponse | 自動返信設定 | 実装済み |
| Quote | Quote管理 | 開発中 |
| Audit Logs | 監査ログ確認 | 実装済み |
| Plugin Store | プラグイン管理 | 予定 |
| Rule Builder | ルール作成 | 予定 |
| Billing | 課金管理 | 予定 |

## API Route方針

- `guildId`付きRouteでは管理可能ギルドか確認する
- 入力はZodなどで検証する
- DB更新時はAuditLogを記録する
- エラーはUIで扱いやすい形式にする

## デザイン方針

- 月、星、魔法の世界観
- Apple風ミニマル
- Glass Card UI
- Dark mode first
- Light mode対応を前提にする

## PR確認

- 画面が崩れていないか
- モバイル表示が破綻していないか
- 権限不足時の表示があるか
- Loading / Empty / Error状態があるか
- スクリーンショットを添付したか
