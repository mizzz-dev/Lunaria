# Lunaria Initial Decisions v0.1

最終更新日: 2026-05-24

## 決定済み

- 初期運用は身内 Discord サーバー向けにする。
- 初期 guild id は `964326043420872704`。
- 最初の対象はゲームコミュニティ。
- Dashboard 候補ドメインは `ivRm.jp`。
- `ivRm.jp` はこれから取得する。
- PostgreSQL を採用する。
- Dashboard は日本語/英語対応にする。
- theme は dark をデフォルトにし、light も提供する。
- Lunaria のキャラクターは少女/人形っぽい方向にする。
- 課金は MVP では実装しないが、サーバー単位とユーザー単位の設計を入れる。
- 録音機能は将来入れる。同意、保存期間、削除導線、暗号化は必須にする。
- Riot 連携は公式 Developer Portal 登録とポリシー遵守を前提にする。
- HoYo 連携は公開ショーケース/公開情報ベースに限定する。
- Web/Minecraft サーバー操作は承認フロー付きジョブとして設計する。
- AI provider は OpenAI から始め、Claude/Gemini を後から追加できる抽象化にする。
- タスク管理は Linear workspace `ivRm` 中心にする。
- GitHub repository は公開予定にする。
- セットアップは Docker Compose で初心者でも動かせる形を目標にする。
- 初期ホスティングは AWS Lightsail にする。

## 判断

### Custom Bot

Custom Bot は魅力が大きいが、v1 に入れると認証、トークン保管、コマンド登録、プロセス分離、障害分離が重くなる。
そのため v2 に回す。

ただし v1 の設計段階で `bot_instances` の余地を残し、公式 Lunaria Bot から Custom Bot へ移行できるようにする。

### AWS と予算

AWS は理想の本番環境だが、月額 2,000 円以内では RDS、ElastiCache、ECS/Fargate の常時稼働は厳しい。
初期は AWS Lightsail + Docker Compose を優先し、収益化または公開 Bot 化後に ECS/RDS へ移行する。

### ブランド

Lunaria は氷、宇宙、月、少女/人形をモチーフにした独自キャラクターを中心にする。
Honkai: Star Rail のヘルタに近い方向性を参考にするが、著作権や商標上のリスクを避けるため、キャラクター、衣装、ロゴ、固有表現は直接複製しない。

### 品質

MVP の期限は固定しない。
小さく動くものを積み上げ、各 milestone で動作確認、レビュー、ドキュメント更新を完了条件にする。

## 未決定

- `ivRm.jp` の DNS 構成
- Lunaria キャラクターの正式デザイン
- Dashboard の最終 accent color
- 最初の OpenAI モデルと利用上限
- Linear project/label/status の詳細構成
