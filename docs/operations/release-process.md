# リリース手順

最終更新日: 2026-05-27

Lunariaのリリースは、developで検証し、mainへ反映する流れを基本にします。

## ブランチ方針

| ブランチ | 用途 |
|---|---|
| `develop` | 開発・検証の統合先 |
| `main` | 安定版・公開向け |
| `feature/ivr-x-*` | 機能開発 |
| `docs/ivr-x-*` | ドキュメント |
| `fix/ivr-x-*` | 修正 |

## PRルール

- 1 Issue = 1 PR
- PRタイトルは `IVR-X 日本語タイトル`
- PR本文、コミット、作業履歴は日本語
- CIが通ること
- 高リスク領域は人間レビュー必須

## リリース前チェック

```powershell
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @lunaria/db db:generate
```

## バージョン管理

Public Alphaまでは明示的なSemVer固定より、PR単位で変更履歴を残します。公開後は以下を検討します。

- `v0.1.0-alpha.x`
- `v0.1.0-beta.x`
- `v1.0.0`

## リリースノート

リリース時は以下を記載します。

- 追加機能
- 変更点
- 修正点
- 既知の問題
- Migration有無
- 人間レビュー対象の変更
