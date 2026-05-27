# バックアップ・復元方針

最終更新日: 2026-05-27

Lunariaのバックアップ対象は、DB、Storage、設定、監査ログです。

## 対象

| 対象 | 内容 |
|---|---|
| PostgreSQL | Guild、Rule、PluginSetting、AuditLog、Quoteなど |
| Object Storage | 将来の録音、画像、添付ファイル |
| 環境設定 | 本番環境変数の定義。実値は別管理 |
| Bot設定 | Discord Application設定は手順書で管理 |

## 基本方針

- DB migration前にバックアップする
- 本番では定期バックアップを設定する
- 復元手順を検証する
- Backupにもアクセス制御をかける
- Secretはバックアップに平文で含めない

## 復元時の確認

- 復元対象の環境
- 対象日時
- Migration状態
- Bot command登録状態
- Dashboardの接続先

## 注意

録音データや文字起こしなどRestrictedデータは、削除申請や保存期間と矛盾しないように扱います。
