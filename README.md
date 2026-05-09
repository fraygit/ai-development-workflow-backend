# AIDevFlow — Backend

Backend monorepo for the AIDevFlow platform. Fastify 5 (TypeScript), Prisma 6, BullMQ, Node.js 22.

## Local dev

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Copy env file
cp .env.example .env
```

## Services

| Service | Port | Description |
|---|---|---|
| Coordination API | 3001 | Fastify — pipeline state, secrets, human gates, SSE |
| Webhook Receiver | 3002 | Fastify — HMAC validation, Pub/Sub publish |
| Compiler | — | Node.js — workflow YAML → GitHub Actions / GitLab CI |

## Structure

```
apps/
  api/          # Coordination API
  webhook-receiver/
  compiler/
packages/
  db/           # Prisma schema + migrations
  types/        # Shared TypeScript types + Zod schemas
  utils/        # Shared utilities (hmac, redis, pubsub, logger)
```
