# ドキュメント運用ルール

最終更新日: 2026-05-27

このドキュメントは、LunariaのGitHub docs、README、Notion、Linearをどう使い分けるかを定義します。

## 基本方針

| 場所 | 役割 |
|---|---|
| GitHub docs | 正本。詳細仕様、手順、設計、運用ルールを保存する |
| README.md | 入口。主要ドキュメントへのリンクを置く |
| Notion | ポータル、進捗管理、レビュー状況、俯瞰用に使う |
| Linear | Issue、優先度、進捗、作業単位の管理に使う |
| PR | 実際の変更内容とレビュー履歴を残す |

GitHub docsを正本とし、Notionには全文コピーではなく、リンク、要約、更新状況、次の作業をまとめます。

## ドキュメント更新が必要な変更

| 変更内容 | 更新すべきドキュメント |
|---|---|
| Discordコマンド追加・変更 | `docs/reference/commands.md`, `docs/development/bot-command-guide.md` |
| API追加・変更 | `docs/reference/api-endpoints.md`, `docs/architecture/api-design.md` |
| DBモデル変更 | `docs/architecture/database-schema.md`, `docs/architecture/domain-logic.md` |
| Plugin追加・変更 | `docs/reference/features.md`, `docs/architecture/plugin-system.md`, `docs/development/plugin-development-guide.md` |
| Rule仕様変更 | `docs/architecture/rule-engine.md`, `docs/development/rule-authoring-guide.md`, `docs/architecture/process-flows.md` |
| Dashboard画面追加・変更 | `docs/development/dashboard-guide.md`, `docs/reference/features.md` |
| セットアップ手順変更 | `docs/setup/local-setup.md`, `docs/setup/troubleshooting.md` |
| 環境変数追加・変更 | `docs/setup/environment-variables.md`, `.env.example` |
| 権限・監査変更 | `docs/security/rbac-audit-policy.md`, `docs/architecture/domain-logic.md` |
| Secret管理変更 | `docs/security/secret-management.md` |
| Recording変更 | `docs/legal/recording-policy-draft.md`, `docs/security/data-retention.md` |
| Server Ops変更 | `docs/security/security-policy.md`, `docs/operations/deployment-guide.md` |
| Public Alpha準備 | `docs/operations/public-alpha-readiness.md` |

## PRチェックリスト

PR作成時は以下を確認します。

- 関連Issueがあるか
- 実装済み / 予定 / Preview / Restricted を混同していないか
- READMEのリンク更新が必要か
- `docs/reference/docs-index.md` の更新が必要か
- Notion Hubの更新が必要か
- 高リスク領域の人間レビューが必要か

## Notion更新ルール

Notionは次の用途に限定します。

- ドキュメントの入口
- ドキュメント更新状況の可視化
- Public Alpha前チェックリスト
- 重要リンク集
- レビュー待ち/更新待ちの管理

Notionに詳細仕様を単独で持たせないようにします。詳細仕様はGitHub docsへ集約します。

## ステータス表記

Lunariaのドキュメントでは、以下のステータスを統一して使います。

| ステータス | 意味 |
|---|---|
| 実装済み | developブランチ上に実装がある |
| 開発中 | 一部実装済み、または検証中 |
| 予定 | 要件定義済みだが未実装 |
| Preview | 高リスク・大型機能として限定検証予定 |
| Restricted | 同意、法務、権限、安全要件を満たした場合のみ提供予定 |
| 草案 | 正式公開前にレビューが必要 |

## 古い情報の扱い

古い情報を見つけた場合:

1. 対応Issueを作る
2. 影響するdocsを特定する
3. PRで修正する
4. 必要ならNotion Hubにも更新メモを残す

## README更新基準

READMEには詳細本文を増やしすぎず、主要ドキュメントへの入口を置きます。

READMEに追加するもの:

- 新しいカテゴリの入口
- セットアップ概要
- 重要なセキュリティ注意
- Public Alpha時の公開リンク

READMEに置かないもの:

- 長いAPI仕様
- 詳細なDB設計
- 長いLegal本文
- 高頻度に変わる実装詳細

## Codexへの指示

Codexに実装を依頼する場合は、対象Issueに以下を含めます。

- 更新対象docs
- 実装済み/予定の区別
- PR本文、コミットメッセージ、作業履歴は日本語
- Secretを含めない
- ドキュメントのみの変更か、実装を含むか

## 関連ドキュメント

- `docs/reference/docs-index.md`
- `README.md`
- Notion: Lunaria Documentation Hub
