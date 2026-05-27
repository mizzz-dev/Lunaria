# Secret管理

最終更新日: 2026-05-27

Lunariaでは、Secretをコード・Issue・PR・ログに含めません。

## Secretの例

- Discord Bot Token
- Discord OAuth Client Secret
- Database URL
- Redis URL
- Stripe Secret Key
- Stripe Webhook Secret
- Riot API Key
- AI Provider API Key
- Encryption Key

## ローカル開発

- `.env.example` をコピーして `.env` を作る
- `.env` はコミットしない
- 実値はローカルだけに置く

## GitHub Actions

- GitHub Secretsを使う
- WorkflowログにSecretを出さない
- PR本文に実値を書かない

## 本番

- ホスティング環境のSecret機能を使う
- 可能ならSecrets Managerを使う
- 定期的にローテーションする

## 漏えい時の対応

1. 該当Secretを無効化する
2. 新しいSecretを発行する
3. 影響範囲を確認する
4. PR、Issue、ログ、スクリーンショットに残っていないか確認する
5. 再発防止をドキュメント化する
