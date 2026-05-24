# Lunaria Docker Runtime

This folder documents the local Docker runtime.

Current services:

- PostgreSQL 16
- Redis 7

Start:

```powershell
docker compose up -d
```

Check health:

```powershell
docker compose ps
```

Troubleshooting:

- If Docker reports `dockerDesktopLinuxEngine` not found, start Docker Desktop first.
- If ports `5432` or `6379` are already in use, change `POSTGRES_PORT` or `REDIS_PORT` in `.env`.

Stop:

```powershell
docker compose down
```

Delete local database/cache volumes:

```powershell
docker compose down -v
```

Only use `docker compose down -v` when local data can be discarded.
