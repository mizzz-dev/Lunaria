# ADR 0004: Use Linear as Primary Task System

日付: 2026-05-24

## Context

Lunaria は AI Native Development を前提にし、Issue を小さく切って継続開発する。
GitHub repository は公開予定だが、日々のタスク管理は高速に扱える Linear に寄せたい。

## Decision

タスク管理は Linear を主とする。
GitHub Issues は公開向けの補助として使う。

## Consequences

- 実装タスクと進捗管理を Linear に集約できる
- PR と Linear Issue の紐付けを意識する
- 公開ユーザーからの問い合わせや報告は GitHub Issues を使う可能性がある

