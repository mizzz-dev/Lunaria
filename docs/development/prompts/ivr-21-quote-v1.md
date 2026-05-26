# IVR-21 Quote Plugin v1 実装プロンプト

## 作業単位

- Linear Issue: `IVR-21` Lunaria: Quote plugin v1 を実装する
- ブランチ名: `feature/Quote-v1`
- 起点ブランチ: `develop`
- PR target: `develop`

## 次に進める理由

AutoResponse と Audit Stream によって、plugin metadata、RBAC、AuditLog、Discord 認証済み Dashboard、実データ表示の縦断経路が確認できた。
Quote は同じ plugin / audit 基盤を再利用しつつ、保存データと Discord command の新しいユースケースを追加できる次の MVP plugin である。

## Codex への依頼プロンプト

```text
D:\develop\01_project\mizzz\Lunaria で、origin/develop を起点に
feature/Quote-v1 ブランチを作成し、Linear IVR-21 の Quote plugin v1 を実装してください。

目的:
Discord の良い発言を Guild ごとに quote として保存し、登録・取得・管理操作を
AuditLog と RBAC に接続した MVP の縦断フローを作る。

最初に行うこと:
1. git status、origin/develop の最新状態、open PR、Linear IVR-21 の状態を確認する
2. docs/requirements/lunaria-prd.md、docs/architecture/lunaria-architecture.md、
   docs/development/ai-native-development.md、
   docs/validation/2026-05-26-auditstream-v2-browser-validation.md を読む
3. AutoResponse の plugin metadata / API / DB store / audit log / test パターンと、
   Bot の command registration パターンを確認する

実装スコープ:
- @lunaria/core に Quote plugin metadata、config validation、RBAC permission、
  audit event 定義を追加する
- @lunaria/db に Guild scope の quote 保存・取得・非表示/削除に必要な永続化を追加する
  - 必要な Prisma schema/migration は Quote に限定して追加する
- Bot に quote 登録とランダム表示の最小 command flow を追加する
  - message context command または /quote add のうち、既存 command 構成に自然な最小案を選ぶ
  - /quote random を提供する
- 登録/非表示/削除など実装した管理操作を AuditLog に残す
- 権限のない Guild 操作と未認証 Dashboard/API 操作を拒否する
- Dashboard を追加する場合は、実データ取得と空/失敗/読込状態を既存パターンに合わせる

受け入れ条件:
- Guild を跨いで quote データが混ざらない
- 引用元 message URL、投稿者、日時、channel、登録者を保存できる
- quote 登録と random 表示の happy path が動く
- 非表示または削除の管理操作を最低 1 つ提供し、audit log が残る
- core/db/API/Bot の追加挙動にテストがある
- secret、private user data、実 Discord message 内容を commit しない

検証:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- git diff --check
- Discord 認証または Bot 実操作が利用可能なら、Browser/Discord で実データ flow を確認し、
  公開可能なキャプチャのみ PR 本文に掲載する

完了時:
- Linear IVR-21 に実装内容、検証結果、PR URL を記録する
- 対象変更だけを commit/push し、develop 向け PR を作成する
```

## スコープ境界

- 画像カード生成、ランキング高度化、report moderation workflow は v2 以降に送る。
- Daily Content、LFG、Basic Moderation の実装を同じ PR に混ぜない。
- 実 Discord メッセージ本文やユーザー識別情報を docs/PR のキャプチャへ残さない。
