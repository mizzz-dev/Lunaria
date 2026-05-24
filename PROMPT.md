# Lunaria Prompt Guide

Use this file when asking an AI coding agent to work on Lunaria.

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
- Use Japanese for PR bodies, commit messages, and work logs unless the issue says otherwise.

