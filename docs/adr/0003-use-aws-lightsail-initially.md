# ADR 0003: Use AWS Lightsail Initially

日付: 2026-05-24

## Context

理想構成は AWS ECS/Fargate、RDS、ElastiCache だが、初期予算は月額 2,000 円以内を目標にしている。
RDS や ElastiCache の常時稼働はこの予算を超えやすい。

## Decision

初期本番は AWS Lightsail + Docker Compose を採用する。
PostgreSQL と Redis も初期は同一 Lightsail instance 上の container で動かす。

## Consequences

- 低コストで AWS 上に置ける
- 運用は単一 VM に寄るため、backup と recovery が重要になる
- 公開 Bot 化や収益化後に ECS/RDS/ElastiCache へ移行する

