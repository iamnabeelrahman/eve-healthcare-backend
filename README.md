# EVE Healthcare Diagnostic Booking Backend

A production-minded backend for managing diagnostic centres, diagnostic tests, centre-specific pricing, patient bookings, simulated payments, and idempotent payment webhooks.

This project deliberately favours a smaller, well-structured, tested solution over a large, sprawling codebase.

---

## Project Overview

Users can register, log in, browse diagnostic centres and the tests they offer (with centre-specific pricing), create bookings, pay through a simulated payment provider, and receive status updates through an idempotent webhook.

Admins can manage centres, tests, and the centre ↔ test price relationships.

### What is intentionally **not** included

* Real payment gateway integration (simulated only)
* Frontend
* Microservices or Kubernetes
* Event sourcing, CQRS, or other heavyweight patterns

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript (strict) |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache / Queue | Redis + BullMQ |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Validation | Zod |
| Logging | Pino + pino-http |
| Docs | Swagger / OpenAPI (`swagger-jsdoc`) |
| Testing | Jest + Supertest |
| Tooling | ESLint, Prettier, Docker, docker-compose |

---

## Architecture

```mermaid
flowchart LR
  Client[Client] --> API[Express API]
  API --> PG[(PostgreSQL)]
  API --> R[(Redis)]
  API -- enqueue --> Q[(BullMQ Queue)]
  Q --> Worker[Webhook Worker]
  Worker --> PG
  Worker --> R
```

**Why each component exists**

* **Express API** — thin HTTP layer; business logic lives in services.
* **PostgreSQL** — the *source of truth* for users, centres, tests, bookings, payments, and webhook events.
* **Prisma** — typed data access with migrations and transactions.
* **Redis** — read-through cache for centre/test listings and rate-limit storage. **Never** the source of truth. If Redis is down, the API falls back to PostgreSQL transparently.
* **BullMQ worker** — handles asynchronous webhook processing so the HTTP handler stays fast. Retries use exponential backoff. Idempotency is enforced at the DB level, so worker retries can never create duplicate payment effects.
* **JWT** — stateless authentication. Role claim drives authorization.
* **Webhook secret** — simulated provider authentication via `x-webhook-secret`.

---

## Setup (Local)

### Prerequisites

* Node.js 20+
* PostgreSQL 14+
* Redis 6+ (optional but recommended)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# then edit .env
```

### 3. Generate Prisma client and run migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Seed the database

```bash
npm run prisma:seed
```

### 5. Start the API

```bash
npm run dev
```

The API listens on `http://localhost:3000`.

Optionally, start the webhook worker in another terminal:

```bash
npm run worker
```

### 6. Running tests

Create a separate test database first:

```bash
createdb -U eve eve_healthcare_test
DATABASE_URL="postgresql://eve:eve_password@localhost:5432/eve_healthcare_test?schema=public" \
  npx prisma migrate deploy
```

Then run:

```bash
npm test
```

Tests load configuration from `.env.test`, not `.env`. See `.env.test` for details.

---

## Docker Setup

```bash
docker compose up --build
```

This starts:

* `postgres` — PostgreSQL 16
* `redis` — Redis 7
* `api` — Express API (runs migrations on startup)
* `worker` — BullMQ webhook worker

Then seed inside the API container:

```bash
docker compose exec api npx prisma db seed
```

API: `http://localhost:3000`
Swagger: `http://localhost:3000/api/docs`

---

## API Documentation

Full interactive docs: **`GET /api/docs`** (Swagger UI).

### Auth

* `POST /api/v1/auth/signup`
* `POST /api/v1/auth/login`
* `GET  /api/v1/auth/me`

### Centres

* `GET    /api/v1/centres?page=1&limit=20`
* `GET    /api/v1/centres/:id`
* `POST   /api/v1/centres` *(ADMIN)*
* `PATCH  /api/v1/centres/:id` *(ADMIN)*
* `DELETE /api/v1/centres/:id` *(ADMIN)*
* `GET    /api/v1/centres/:centreId/tests`
* `POST   /api/v1/centres/:centreId/tests` *(ADMIN)*
* `PATCH  /api/v1/centres/:centreId/tests/:testId` *(ADMIN)*
* `DELETE /api/v1/centres/:centreId/tests/:testId` *(ADMIN)*

### Tests

* `GET    /api/v1/tests?page=1&limit=20`
* `GET    /api/v1/tests/:id`
* `POST   /api/v1/tests` *(ADMIN)*
* `PATCH  /api/v1/tests/:id` *(ADMIN)*
* `DELETE /api/v1/tests/:id` *(ADMIN)*

### Bookings *(auth required)*

* `POST  /api/v1/bookings`
* `GET   /api/v1/bookings?page=1&limit=20`
* `GET   /api/v1/bookings/:id`
* `PATCH /api/v1/bookings/:id/cancel`

### Payments

* `POST /api/v1/payments` *(auth required)* — simulate a payment attempt
* `POST /api/v1/payments/webhook` *(webhook secret)* — idempotent provider callback

### Health

* `GET /health`
* `GET /health/ready`

---

## Example Requests

### Signup

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"John Doe","email":"john@example.com","password":"SecurePassword123"}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "b1e2...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "createdAt": "2026-01-01T10:00:00.000Z"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"john@example.com","password":"SecurePassword123"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "b1e2...", "email": "john@example.com", "role": "USER" }
  }
}
```

### List centres

```bash
curl http://localhost:3000/api/v1/centres?page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "c-1", "name": "Downtown Diagnostics", "location": "Mumbai" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

### List tests at a centre

```bash
curl http://localhost:3000/api/v1/centres/c-1/tests
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ct-1",
      "centreId": "c-1",
      "testId": "t-1",
      "price": "500",
      "test": { "id": "t-1", "name": "Complete Blood Count" }
    }
  ]
}
```

### Create a booking

```bash
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "centreTestId": "ct-1",
    "appointmentDateTime": "2030-01-01T10:00:00.000Z"
  }'
```

> You must **not** send an `amount` field. The server snapshots the price from `CentreTest`. Sending `amount` returns `400 VALIDATION_ERROR`.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "b-1",
    "userId": "b1e2...",
    "centreTestId": "ct-1",
    "appointmentDateTime": "2030-01-01T10:00:00.000Z",
    "amount": "500",
    "status": "PENDING"
  }
}
```

### Pay for a booking

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"bookingId":"b-1"}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "payment": { "id": "p-1", "status": "SUCCESS", "providerPaymentId": "pay_..." },
    "bookingStatus": "CONFIRMED"
  }
}
```

To force deterministic outcomes:

```
PAYMENT_SIMULATION_MODE=success    # always SUCCESS
PAYMENT_SIMULATION_MODE=failure    # always FAILED
PAYMENT_SIMULATION_MODE=random     # 80/20 default
```

### Webhook (simulated provider)

```bash
curl -X POST http://localhost:3000/api/v1/payments/webhook \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{
    "eventId": "evt_123",
    "eventType": "payment.status_updated",
    "paymentId": "pay_123",
    "bookingId": "b-1",
    "status": "SUCCESS"
  }'
```

Send it twice — the second call returns `{ "duplicate": true }` with no side effects.

### Error response shape

Every error follows this shape:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_FOUND",
    "message": "Booking not found"
  }
}
```

---

## Authentication

1. Sign up — the server hashes the password with bcrypt and stores `passwordHash`.
2. Log in — the server returns a signed JWT containing `sub` (user id), `email`, and `role`.
3. Send `Authorization: Bearer <token>` on protected routes.
4. `authenticate` middleware verifies the JWT; `requireRole('ADMIN')` enforces admin-only routes.

JWT secret and expiration come from environment variables. `passwordHash` is never returned in any response. Invalid credentials return the same generic message whether the email exists or not, to prevent account enumeration.

---

## API Versioning

All REST routes are prefixed with **`/api/v1/`**. This gives us:

* A stable contract for existing clients.
* Room to introduce `/api/v2/` later without breaking existing consumers.
* Clear, explicit API evolution rather than silent breaking changes.

Health endpoints are intentionally **not** versioned (`/health`, `/health/ready`) because they reflect infrastructure state, not the API surface.

---

## Database / Schema Design

The data model centres on the fact that a **test's price depends on the centre** that offers it, and that a **booking snapshots the price at booking time** so later price changes don't affect it.

```mermaid
erDiagram
  USER ||--o{ BOOKING : places
  DIAGNOSTIC_CENTRE ||--o{ CENTRE_TEST : offers
  DIAGNOSTIC_TEST ||--o{ CENTRE_TEST : available_as
  CENTRE_TEST ||--o{ BOOKING : booked_as
  BOOKING ||--o{ PAYMENT : has
  WEBHOOK_EVENT {
    string eventId UK
  }
```

### Tables

**`users`**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | text | |
| email | text | UNIQUE |
| passwordHash | text | bcrypt; never returned |
| role | enum(USER, ADMIN) | default USER |
| createdAt / updatedAt | timestamp | |

**`diagnostic_centres`** — a physical lab or clinic.
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | text | indexed |
| location | text | |

**`diagnostic_tests`** — a type of test (CBC, Lipid Profile, etc.).
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | text | indexed |
| description | text | nullable |

**`centre_tests`** — join table carrying the **centre-specific price**.
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| centreId | UUID | FK → diagnostic_centres |
| testId | UUID | FK → diagnostic_tests |
| price | Decimal(10,2) | |
| UNIQUE(centreId, testId) | | prevents duplicate offerings |

**`bookings`** — a patient's commitment to attend.
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → users |
| centreTestId | UUID | FK → centre_tests |
| appointmentDateTime | timestamp | must be future |
| amount | Decimal(10,2) | **snapshot** of CentreTest.price at booking |
| status | enum(PENDING, CONFIRMED, FAILED, CANCELLED) | |

**`payments`** — one *attempt* at paying for a booking.
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| bookingId | UUID | FK → bookings |
| amount | Decimal(10,2) | mirrors booking amount |
| status | enum(SUCCESS, FAILED) | |
| provider | text | "MOCK_PROVIDER" |
| providerPaymentId | text | UNIQUE; the provider's ID |

**`webhook_events`** — the idempotency ledger.
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| eventId | text | **UNIQUE** — the idempotency key |
| eventType | text | |
| payload | JSON | full request body |
| processedAt | timestamp | nullable until worker processes |

### Indexes

* `User.email` (implicit via UNIQUE)
* `Booking.userId`, `Booking.status`, `Booking.appointmentDateTime`
* `Payment.bookingId`
* `CentreTest.centreId`, `CentreTest.testId`
* `WebhookEvent.eventId` (implicit via UNIQUE)

### Why this design (and not one big Booking table)

Storing everything in one table would mean storing the test name, centre name, price, and status all on every booking. That breaks three rules:

1. **Duplication** — change a centre's name, and you'd need to update every booking.
2. **Inconsistency** — different bookings for the same test could record different names if edited at different times.
3. **Loss of relationship** — you'd lose the ability to ask "which tests does Centre X offer and at what price?"

This design is in **third normal form** for its core entities: every non-key column depends on the key, the whole key, and nothing but the key. The one deliberate exception is `Booking.amount`, which is a **snapshot** — an intentional denormalisation for auditability and price-locking.

---

## Booking Lifecycle

```text
PENDING ──► CONFIRMED
   │              │
   ├──► FAILED    │
   └──► CANCELLED ◄┘
```

| Transition | Trigger |
|-----------|---------|
| `PENDING → CONFIRMED` | Successful simulated payment or `SUCCESS` webhook |
| `PENDING → FAILED` | Failed simulated payment or `FAILED` webhook |
| `PENDING → CANCELLED` | `PATCH /bookings/:id/cancel` by owner or admin |
| `CONFIRMED → CANCELLED` | `PATCH /bookings/:id/cancel` by owner or admin |
| `FAILED → *` | Not allowed |
| `CANCELLED → *` | Not allowed |

Clients **cannot** submit a status directly. Status changes are only produced by business operations.

---

## Payment Flow

1. `POST /api/v1/payments` with `{ bookingId }`.
2. The service loads the booking and enforces:
   * booking exists,
   * caller owns it (or is admin),
   * booking is `PENDING`,
   * no successful payment already exists.
3. The simulated provider returns `SUCCESS` or `FAILED`.
   * `PAYMENT_SIMULATION_MODE=success|failure` for deterministic behaviour.
   * `PAYMENT_SIMULATION_MODE=random` (default) uses 80/20 weighting.
4. Payment row is created with the **booking's amount** (never a client-supplied amount).
5. Booking status is updated **in the same transaction**.
6. The `updateMany` on `booking` uses `WHERE status = 'PENDING'` so concurrent requests cannot double-transition a booking.

---

## Webhook Idempotency

The webhook is the most safety-critical endpoint. Strategy:

1. Authentication via constant-time `x-webhook-secret` comparison. No user JWT.
2. The request body is validated by Zod (UUIDs, required fields, enum status).
3. `webhookEventRepository.tryCreate(...)` **attempts an INSERT** into `webhook_events` with the provider-supplied `eventId`.
   * The database has a **UNIQUE constraint** on `eventId`.
   * If the insert succeeds → first time we've seen the event.
   * If the insert fails with `P2002` → the event has already been accepted; we return HTTP 200 idempotent success **without side effects**.
4. If the event is new, we either enqueue a BullMQ job (normal mode) or process synchronously (test mode / Redis unavailable).
5. Processing itself is idempotent:
   * Payments are looked up by `providerPaymentId` (UNIQUE).
   * Booking transitions only happen when the booking is in `PENDING`.
   * The whole `Payment` + `Booking` update runs inside a single Prisma transaction.

Because the UNIQUE constraint is enforced by PostgreSQL, **concurrent duplicate requests race safely** — exactly one wins, the others return idempotent success.

**The DB, not Redis, is the source of truth for idempotency.** Redis being down does not affect correctness.

### Retry behaviour

BullMQ retries failed webhook jobs with exponential backoff. Configuration:

* `attempts: 5`
* `backoff: { type: 'exponential', delay: 1000 }`
* `jobId: eventId` — the queue itself also deduplicates by job id.

Permanent 4xx business errors (e.g. unknown booking) are logged and quickly exhaust retries; they are not retried indefinitely.

---

## Redis Caching Strategy

Cached reads (TTL 60s):

* `centres:list:{page}:{limit}`
* `centre:{id}`
* `centre:{id}:tests`
* `tests:list:{page}:{limit}`
* `test:{id}`

Invalidation:

* Creating/updating/deleting a centre → invalidate `centre:{id}` **and** `centres:list:*`.
* Creating/updating/deleting a test → invalidate `test:{id}` **and** `tests:list:*`.
* Associating/updating/removing a centre-test price → invalidate `centre:{centreId}:tests`.

**Never cached:** bookings, payments, webhook events. Financial state must always come from PostgreSQL.

**Graceful degradation:** every cache operation is wrapped and swallowed. If Redis is unavailable, the API simply reads from PostgreSQL.

---

## Rate Limiting

Using `express-rate-limit`, backed by Redis when available:

* **Auth endpoints** (`/auth/signup`, `/auth/login`) — stricter limit (default 10 req/min/IP).
* **Webhook** — more permissive (default 100 req/min/IP) because providers legitimately retry.

Tunable via env: `AUTH_RATE_LIMIT_*` and `WEBHOOK_RATE_LIMIT_*`.

---

## Structured Logging

* Pino + `pino-http`.
* Every request gets an `x-request-id` (propagated from the header if present, else generated).
* Logs include `requestId`, `method`, `path`, `statusCode`, and error `code` where applicable.
* **Redacted** paths: `Authorization`, `x-webhook-secret`, `password`, `passwordHash`.
* Pretty output in development; raw JSON in production.

---

## Edge Cases Handled

* Invalid / missing UUIDs → `400 VALIDATION_ERROR`.
* Non-existent resources → `404 ..._NOT_FOUND`.
* Duplicate email → `409 EMAIL_IN_USE`.
* Duplicate centre/test association → `409 CENTRE_TEST_EXISTS`.
* Past appointment date → `422 APPOINTMENT_IN_PAST`.
* Client attempting to set `amount` or `status` → `400 VALIDATION_ERROR` (Zod `.strict()`).
* Accessing another user's booking → `403 FORBIDDEN`.
* Cancelling an already cancelled booking → `409 BOOKING_ALREADY_CANCELLED`.
* Invalid status transition → `409 INVALID_STATUS_TRANSITION`.
* Paying for a cancelled / already paid / non-PENDING booking → `409`.
* Concurrent payment requests → blocked by `updateMany` guard on `status = 'PENDING'`.
* Webhook: missing/invalid secret → `401`.
* Webhook: malformed payload → `400`.
* Webhook: duplicate event, repeated many times → idempotent `200`.
* Webhook: concurrent duplicates → exactly one persisted effect.

---

## Assumptions

Where the assignment did not specify exact rules, we chose the following and documented them:

1. **Appointments must be in the future.** Past timestamps are rejected with `422`.
2. **Bookings cannot be un-cancelled.** `CANCELLED` and `FAILED` are terminal states.
3. **Only one successful payment per booking.** Further attempts after success are rejected with `409`.
4. **Failed payments do not auto-retry.** A new booking is required to try again.
5. **Centre/test management is ADMIN-only.** Reads are public.
6. **Webhook events are append-only.** They record `processedAt` but are never edited or deleted.
7. **Signup always creates a USER.** Roles cannot be self-assigned. Admins are seeded.
8. **Payment amount is always derived from `Booking.amount`,** itself snapshotted from `CentreTest.price` at booking time.
9. **Pagination defaults to `page=1, limit=20`** with `limit` capped at 100.
10. **Webhook uses a static shared secret** (`x-webhook-secret`) rather than HMAC signatures. In production this would be an HMAC over the body with a rotating secret.

---

## Testing

```bash
npm test
```

* Integration tests cover all critical flows: auth, centres, tests, bookings, payments, webhooks (including concurrency).
* Unit tests cover booking status transitions and cache helpers.
* `PAYMENT_SIMULATION_MODE=success` is set in `.env.test` for deterministic results.

Redis and PostgreSQL must be reachable when running tests. Cache tests self-skip if Redis is unavailable.

**Test database:** tests run against `eve_healthcare_test`, not your dev database. See "Running tests" above.

---

## Development Credentials

The seed creates:

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@example.com` | `Admin@12345` |
| USER | `john@example.com` | `User@12345` |
| USER | `jane@example.com` | `User@12345` |

> **These credentials are for local development only. Never use them in production.**

---

## Code Quality

* Thin controllers, business logic in services, data access in repositories.
* Strong TypeScript types — `any` is disallowed by ESLint.
* Centralized error handling via `AppError` + Express error middleware.
* `asyncHandler` removes try/catch noise.
* Zod schemas are reused across validation middleware and Swagger docs.
* Database-level constraints prevent race conditions and enforce business invariants.
* Prisma transactions protect multi-record operations.

---

## Submission Files

The assignment lists `requirements.txt` or `pyproject.toml` as required submission files. Those are Python dependency manifests and do not apply to this Node.js / TypeScript project. The Node equivalents are `package.json` and `package-lock.json`.

| Assignment (Python) | This project (Node) |
|---|---|
| Django / FastAPI / Flask | Express |
| requirements.txt / pyproject.toml | package.json / package-lock.json |
| Celery | BullMQ |
| Pydantic | Zod |
| SQLAlchemy / Django ORM | Prisma |
| pytest | Jest + Supertest |
| Pydantic + OpenAPI | swagger-jsdoc |

All other submission requirements (README.md, Dockerfile, docker-compose.yml, source code, tests) are present as specified.

---

## Future Improvements

If given more time, the following would meaningfully improve the system:

1. **Transactional outbox pattern** for webhook enqueueing. Currently the `WebhookEvent` row is inserted, and *then* the BullMQ job is enqueued. If the process crashes in between, the event is recorded but never processed. An outbox would make the enqueue atomic with the insert.
2. **HMAC signature verification** on the webhook (like Stripe's `Stripe-Signature`), replacing the shared secret. Prevents replay and tampering.
3. **Slot-based booking.** Currently two users can book the same centre at the same time. A real system would model discrete slots with unique constraints.
4. **Refunds as a first-class entity.** Right now cancelling a confirmed booking doesn't create a refund record.
5. **Payment reconciliation job.** A scheduled job that re-checks `PENDING` bookings against the provider's API to catch missed webhooks.
6. **Distributed tracing** (OpenTelemetry) linking API requests, queue jobs, and DB queries by `requestId`.
7. **Multi-tenant support** with per-tenant admins and centres.
8. **Soft deletes + audit log** for centres and tests, so historical bookings retain context after a resource is removed.

---

## License

MIT.