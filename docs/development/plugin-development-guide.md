# Plugin開発ガイド

最終更新日: 2026-05-27

このガイドは、LunariaにPluginを追加・拡張するときの開発ルールです。

## 追加手順

1. Pluginの目的を明確にする
2. Plugin IDを決める
3. 設定スキーマを定義する
4. 必要権限とIntentを列挙する
5. Auditイベントを定義する
6. DB永続化が必要か判断する
7. Bot / Dashboard / API / Worker の責務を分ける
8. テストとドキュメントを追加する

## 責務分離

| 層 | 責務 |
|---|---|
| core | 純粋なドメインロジック |
| db | 永続化 |
| bot | Discord interaction処理 |
| dashboard | 管理UIとAPI Route |
| worker | 非同期処理・定期処理 |

## 必須確認

- guildId分離が守られている
- 権限判定がある
- 監査ログが必要な操作で記録される
- Secretや個人情報をログに出していない
- 未実装機能を実装済みに見せていない

## PRに書くこと

- 追加したPluginの目的
- 変更ファイル
- 必要権限
- 必要Intent
- 監査イベント
- テスト結果
- リスク
