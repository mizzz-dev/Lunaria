# Lunaria Prompt Guide

Lunaria の開発を AI coding agent に依頼するときは、このファイルを参照する。

## Project Context

Lunaria is a plugin-based Discord bot and dashboard for game communities.

Core principles:

- Plugin-first architecture
- Rule engine: trigger -> condition -> action
- Guild-level multi-tenancy
- RBAC and audit logs
- Public repository safety
- Docker Compose local setup
- Linear-first task management

## Before Coding

Read:

- `docs/requirements/lunaria-prd.md`
- `docs/requirements/initial-decisions.md`
- `docs/architecture/lunaria-architecture.md`
- `docs/development/ai-native-development.md`
- `docs/development/linear-backlog.md`

## Rules

- Do not commit secrets.
- Keep changes scoped to the issue.
- Prefer TypeScript.
- Prefer existing project patterns once implementation exists.
- Add or update tests when behavior changes.
- Update docs when architecture or setup changes.
- PR本文、コミットメッセージ、ドキュメント、作業ログ、Issueコメントは、Issueで別指定がない限り日本語で書く。
