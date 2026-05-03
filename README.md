# Incident Management System (IMS)

A production-grade incident management system built for monitoring distributed infrastructure — APIs, MCP Hosts, Caches, Async Queues, RDBMS, and NoSQL stores. Signals flow in at high volume, get intelligently debounced into work items, and move through a structured workflow all the way to a mandatory Root Cause Analysis before closure.

GitHub: https://github.com/Sarvjais12/ims-project

---

## Architecture

```
Signals (up to 10,000/sec)
        |
        v
  Rate Limiter (token bucket)
        |
        v
  Ingestion API (HTTP POST / WebSocket)
        |
        v
  Ring Buffer — 50,000 slots (backpressure layer)
        |
        v
  Debounce Engine — 100 signals / 10s window → 1 Work Item
        |
   _____|_____________________________
  |          |            |          |
  v          v            v          v
MongoDB   PostgreSQL    Redis    TimescaleDB
(raw      (work items  (dashboard  (timeseries
signals)   + RCA)       cache)      metrics)
        |
        v
  REST API Layer (Express + TypeScript)
        |
        v
  React Dashboard (live refresh every 5s)
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Node.js + TypeScript | Async I/O, great for high-throughput signal ingestion |
| Raw signal store | MongoDB | Schema-less, high write throughput, audit log |
| Source of truth | PostgreSQL + TimescaleDB | Transactional work item state, MTTR timeseries |
| Hot-path cache | Redis | Dashboard reads without hitting Postgres every time |
| Frontend | React + Vite | Fast, component-based, WebSocket-friendly |
| Auth | JWT (jsonwebtoken) | Stateless token auth on all API routes |
| Containers | Docker Compose | One command to bring up the full stack |

---

## How Backpressure Works

Signals arrive faster than any database can write. Instead of writing directly to MongoDB on every HTTP request (which would cause cascading failures at 10k/sec), signals are pushed into an **in-memory ring buffer** with 50,000 slots.

A background worker drains this buffer in batches of 200 every 50ms and processes them through the debounce engine. If the buffer fills up completely, new signals are rejected with a `429` response — the server never crashes, it degrades gracefully. This decouples ingestion speed from persistence speed entirely.

---

## Design Patterns

**Strategy Pattern — Alerting priority**
Different component types get different priorities at runtime. `RDBMS → P0`, `API/MCP/Queue → P1`, `Cache → P2`. The priority mapping is a simple lookup that can be swapped without touching ingestion logic.

**State Pattern — Work item lifecycle**
Each state (`OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`) is its own class that knows its valid next transition. Invalid jumps (e.g. `OPEN → CLOSED`) are rejected by the state itself, not by a chain of if/else checks. The `CLOSED` state additionally gates on RCA presence.

**Dependency Injection — DebounceEngine**
The debounce engine doesn't import any database directly. It receives `createWorkItem` and `linkSignal` as constructor parameters. This makes it fully testable without a real database and swappable to any storage backend.

---

## Setup

### One command (Docker)

```bash
docker compose up -d
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/health

### Local development

```bash
# Terminal 1 - databases only
docker compose up postgres mongodb redis -d

# Terminal 2 - backend
cd backend
npm install
npm run dev

# Terminal 3 - frontend
cd frontend
npm install
npm run dev
```

---

## Authentication (JWT)

All API routes are protected with JWT bearer token authentication.

**Get a token:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

**Use the token:**
```bash
curl http://localhost:3000/api/incidents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Tokens expire in 24 hours. The secret is configured via `JWT_SECRET` in `.env`.

---

## Simulate a cascade failure

```bash
node scripts/simulate-failure.js
```

This simulates a real-world scenario: RDBMS primary goes down, MCP hosts lose their data source, cache invalidation storm follows. Five signals across three component types, staggered 500ms apart, creating work items at P0, P1, and P2 priority.

---

## Run tests

```bash
cd backend
npm test
```

6 unit tests covering the state machine and RCA validation logic:
- OPEN → INVESTIGATING (valid)
- OPEN → CLOSED (rejected)
- RESOLVED → CLOSED with RCA (valid)
- RESOLVED → CLOSED without RCA (rejected)
- CLOSED → any (throws)
- INVESTIGATING → RESOLVED (valid)

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Get JWT token |
| POST | /api/signals | Ingest a signal (rate limited) |
| GET | /api/incidents | List active incidents by severity |
| GET | /api/incidents/:id | Incident detail + raw signals |
| PUT | /api/incidents/:id/state | Transition state |
| POST | /api/incidents/:id/rca | Submit RCA (required before CLOSED) |
| GET | /health | Health check for all dependencies |

---

## Observability

- `/health` — checks PostgreSQL, MongoDB, and Redis connectivity, returns degraded status if any fail
- Console metrics every 5 seconds: `signals/sec | Buffer size | Active debounce windows`
- MTTR auto-calculated on RCA submission: `(incident_end - incident_start) / 60` in minutes

---

## Non-functional additions (bonus)

- **JWT authentication** on all API routes — stateless, expiry-based, configurable secret
- **Redis caching** on dashboard endpoint — 10 second TTL, invalidated on state changes
- **Transactional RCA submission** — PostgreSQL BEGIN/COMMIT/ROLLBACK ensures both RCA record and work item update succeed or both fail
- **Retry logic** — exponential backoff on DB writes
- **Rate limiting** — token bucket on ingestion endpoint, returns 429 on overflow instead of crashing
