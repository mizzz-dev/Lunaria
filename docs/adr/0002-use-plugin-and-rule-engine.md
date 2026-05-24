# ADR 0002: Use Plugin System and Rule Engine

日付: 2026-05-24

## Context

Lunaria は AutoResponse、Quote、Daily Content、LFG、Moderation、AI、録音、ゲーム連携、サーバー操作など大量の機能を扱う。
機能ごとに個別実装すると、設定、権限、監査ログ、課金境界が破綻しやすい。

## Decision

すべての機能は Plugin として扱い、自動化は Rule Engine の `trigger -> condition -> action` で表現する。

## Consequences

- 機能の有効化/無効化を guild 単位で管理できる
- RBAC、audit log、quota、billing を plugin 単位で扱える
- 初期実装は少し重くなるが、後から大型機能を追加しやすくなる

