# ADR 0001: Use TypeScript Monorepo

日付: 2026-05-24

## Context

Lunaria は Bot、API、Dashboard、Worker、shared packages を持つ。
それぞれを別 repository にすると、初期開発で型、設定、DB client、plugin contract が分散しやすい。

## Decision

Lunaria は TypeScript monorepo として開始する。
package manager は pnpm を第一候補にする。

## Consequences

- shared type と contract を再利用しやすい
- Bot/API/Dashboard の変更を同じ PR で扱える
- repository が大きくなりやすいため、package boundary と Issue 分割を守る

