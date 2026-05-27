# Notion運用ガイド

最終更新日: 2026-05-27

このドキュメントは、LunariaのNotionワークスペースを業務運用するためのガイドです。

Lunariaでは、GitHub docsを正本、Notionをポータル・台帳・レビュー管理として扱います。詳細な仕様、設計、手順はGitHubに残し、Notionにはリンク、状態、レビュー状況、次のアクションをまとめます。

## 基本方針

| 場所 | 役割 |
|---|---|
| GitHub docs | 正本。仕様、設計、手順、運用ルールを保存する |
| README.md | 主要ドキュメントへの入口 |
| Notion | ポータル、台帳、レビュー管理、公開準備、リスク管理 |
| Linear | Issue、優先度、進捗、作業単位の管理 |
| GitHub PR | 変更内容、レビュー履歴、確認結果の記録 |

Notionの情報とGitHub docsが食い違う場合は、GitHub docsを優先します。

## Lunaria Documentation Hub

Notionの中心ページです。

- Lunaria Documentation Hub
- URL: `https://www.notion.so/36d7322f39fa814ab95ef79ddd8a54a2`

役割:

- Lunaria関連ドキュメントの入口
- 主要DBへの導線
- Public Alpha準備状況の確認
- リスク領域の確認
- ドキュメントレビュー状況の確認

Hub配下には、以下のDBを置きます。

| DB | 用途 |
|---|---|
| Lunaria Docs Registry | GitHub docsの台帳、レビュー周期、関連Issue/PR管理 |
| Lunaria Decision Log | ADR、重要判断、運用判断の記録 |
| Lunaria Public Alpha Readiness | Public Alpha公開前チェックリスト |
| Lunaria Risk Register | 高リスク領域のリスク管理 |

## Docs Registry運用

Docs Registryは、GitHub docsの台帳です。

主な項目:

| 項目 | 内容 |
|---|---|
| Document | ドキュメント名 |
| Category | Reference / Setup / Architecture / Development / Security / Operations / Legal / ADR |
| Status | 運用中 / 草案 / 追加候補 / 要レビュー / 廃止候補 |
| Priority | 高 / 中 / 低 |
| Risk | High / Medium / Low |
| Source of Truth | 原則 GitHub |
| GitHub Path | 正本ファイルのパス |
| GitHub URL | 正本ファイルへのリンク |
| Update Trigger | 更新が必要になる条件 |
| Review Cadence | 随時 / 月次 / 四半期 / リリース前 / Public Alpha前 |
| Last Reviewed | 最終レビュー日 |
| Next Review | 次回レビュー予定日 |
| Related Issue | 関連Linear Issue |
| Related PR | 関連GitHub PR |

更新タイミング:

- GitHub docsを追加したとき
- ドキュメントを移動・削除したとき
- レビュー周期やリスクが変わったとき
- 古い情報を見つけたとき

運用ルール:

- GitHub PathとGitHub URLは必ず入れる
- RiskがHighのドキュメントはPublic Alpha前にレビューする
- Legal草案はStatusを草案にする
- 廃止候補にする場合は置き換え先をメモする

推奨View:

- カテゴリ別 Board
- 要レビュー Table
- High Risk Table
- Public Alpha前レビュー Table

## Decision Log運用

Decision Logは、重要判断を残すDBです。

記録するもの:

- アーキテクチャ判断
- セキュリティ方針
- 高リスク機能の方針
- Public Alpha公開条件
- GitHub docsとNotionの運用方針
- 大きな仕様変更や廃止判断

運用ルール:

- 判断の詳細はGitHub docsまたはADRに残す
- Notionには判断の要約とリンクを残す
- 置き換えられた判断は削除せず、Supersededにする
- 再レビューが必要な判断にはReview Neededを付ける

推奨View:

- Accepted
- Review Needed
- Type別 Board
- High Impact

## Public Alpha Readiness運用

Public Alpha Readinessは、公開前の準備項目を管理するDBです。

管理対象:

- 利用規約・プライバシーポリシー正式化
- Discord Bot公開設定とIntent確認
- 本番環境の機密情報管理
- 本番DBバックアップ・復元
- 監視・ログ
- Stripe課金
- サポート導線
- データ削除導線
- ドキュメントレビュー

運用ルール:

- 完了にする前にEvidenceを入れる
- Legal / Security / Billingは人間レビューを前提にする
- ブロック中の項目は、理由と解除条件をNotesに書く
- Public Alpha前に高優先度項目が残っていないか確認する

推奨View:

- Area別 Board
- ブロック中
- 高優先度
- レビュー待ち

## Risk Register運用

Risk Registerは、高リスク領域を追跡するDBです。

対象領域:

- Recording
- Server Ops
- Billing
- Personal Data
- Discord
- Security
- Infrastructure
- Game Integration

運用ルール:

- CriticalまたはHighは放置しない
- Mitigationには具体策を書く
- Acceptedにする場合は受容理由を残す
- Closedにする場合は解決したPRや証跡を残す
- Recording / Server Ops / Billing / Personal DataはPublic Alpha前にレビューする

推奨View:

- Open Risks
- Critical / High
- Area別 Board
- Review Due

## GitHub docsとの同期ルール

GitHub docsとNotionの同期は、以下の順で行います。

1. GitHub docsを更新する
2. PRを作る
3. READMEやdocs-indexの更新が必要か確認する
4. Notion Docs Registryの対象レコードを更新する
5. 重要判断があればDecision Logに残す
6. Public Alpha準備に関係する場合はReadinessを更新する
7. 高リスク領域に関係する場合はRisk Registerを更新する

Notionだけを更新してGitHub docsを更新しない状態は避けます。Notionに一時メモを残す場合は、あとでGitHub docsへ反映するIssueを作成します。

## PR作成時のNotion確認

PR作成時は、以下を確認します。

- 新しいドキュメントを追加したか
- 既存ドキュメントの場所や名前を変えたか
- Public Alpha準備項目に影響するか
- Security / Legal / Billing / Recording / Server Opsに影響するか
- 重要判断としてDecision Logに残すべきか
- Docs RegistryのLast ReviewedやRelated PRを更新すべきか

PR本文には、Notion更新が必要な場合は更新内容を書きます。不要な場合は「Notion更新不要」と明記します。

## 月次レビュー手順

月次レビューでは、以下を確認します。

1. Docs RegistryでReview Cadenceが月次のものを確認する
2. Last Reviewedが古いものを洗い出す
3. High Riskのドキュメントを確認する
4. Decision LogのReview Neededを確認する
5. Public Alpha Readinessのブロック中・高優先度を確認する
6. Risk RegisterのOpen / Critical / Highを確認する
7. 必要なGitHub IssueまたはLinear Issueを作成する
8. レビュー完了後、Last ReviewedとNext Reviewを更新する

## 役割分担

| 作業 | GitHub | Notion | Linear |
|---|---|---|---|
| 詳細仕様を書く | 主 | 補助 | なし |
| 仕様の入口を作る | 主 | 主 | なし |
| 実装タスクを管理する | 補助 | 補助 | 主 |
| レビュー状況を見る | 補助 | 主 | 補助 |
| 公開準備を見る | 補助 | 主 | 補助 |
| リスクを追跡する | 補助 | 主 | 補助 |
| 変更履歴を見る | 主 | 補助 | 補助 |

## 注意事項

- Notionに機密情報や個人情報の実値を書かない
- GitHub docsとNotionの内容が食い違う場合はGitHub docsを優先する
- Legal草案は正式公開前にレビューする
- Recording / Server Ops / Billingは高リスク領域として扱う
- NotionのDB構造を変えた場合は、このドキュメントも更新する

## 関連リンク

- Lunaria Documentation Hub: `https://www.notion.so/36d7322f39fa814ab95ef79ddd8a54a2`
- GitHub Repository: `https://github.com/mizzz-dev/Lunaria`
- ドキュメント索引: `docs/reference/docs-index.md`
- ドキュメント運用ルール: `docs/development/documentation-policy.md`
