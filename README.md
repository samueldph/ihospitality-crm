# IHospitality CRM

DirecTV install & service management for hospitality properties — Next.js + Prisma +
PostgreSQL + Redis (BullMQ) + MinIO, behind Caddy (automatic HTTPS). Market: USA / USD.

> **Status: v0.1 foundation.** The stack, data model, money logic, payments, auth,
> health/readiness, branding, and the full Docker deploy are in place and build/run.
> Business screens (accounts, work orders, invoice/credit/payment UI) and the branded
> PDF paperwork are the next layer — see "Roadmap".

## Stack
- **Web**: Next.js 14 (App Router, standalone output), NextAuth (credentials).
- **Data**: PostgreSQL 16 via Prisma. Money is **BigInt cents** end-to-end.
- **Jobs**: Redis 7 + BullMQ worker (`src/worker.ts`).
- **Files**: MinIO (S3-compatible), private on the compose network, scoped app user.
- **Edge**: Caddy 2 — automatic HTTPS, HSTS, nosniff, X-Frame-Options.
- **Payments**: Stripe + PayPal hosted checkout, idempotent + `FOR UPDATE`-safe.

## Local development
```bash
npm install
npm test                       # finance money-math tests (vitest)
cp .env.example .env           # fill in secrets + a local DATABASE_URL
npx prisma migrate dev         # create the schema
ADMIN_EMAIL=you@ihospitality.tv ADMIN_PASSWORD='a-strong-pass' npm run prisma:seed
npm run dev
```

## Run the whole stack (Docker)
```bash
cp .env.example .env           # set DOMAIN, ACME_EMAIL, APP_URL, and every secret
docker compose up -d --build   # app + worker + postgres + redis + minio + caddy
```
`minio-init` creates the `crm-files` bucket and a scoped app user automatically.
The web container runs `prisma migrate deploy` on startup (the worker does not).

## Deploy to a VPS
See `setup-vps.sh` and the deploy runbook. In short: Ubuntu 24.04, 2 vCPU / 4 GB,
US region; run `setup-vps.sh`, drop in the repo + `.env`, `docker compose up -d --build`.
Health probes: `/api/health` (liveness) and `/api/ready` (DB+Redis — point the uptime
monitor and CI deploy gate here).

## Payments
`src/server/payments/` — Stripe Checkout + PayPal Orders, both converging on
`record.ts`, which is idempotent on the gateway event id and takes
`SELECT … FOR UPDATE` on the invoice (no double-apply under retries/concurrency).
Set the Stripe/PayPal keys in `.env` and register the webhook endpoints
(`/api/webhooks/stripe`, `/api/webhooks/paypal`).

## Branding
The IHospitality logo is referenced from `public/logo.svg` via `BrandHeader`
(app shell) — **swap that file for the real logo asset**. The same mark goes on the
invoice / work-order / credit-note / receipt templates when those are built.

## Security notes (baked in)
- Money as BigInt cents (no float, no 32-bit overflow).
- Credit idempotency key (unique) + credit-cap enforcement; `FOR UPDATE` on apply.
- Hosted checkout only — no card data touches the server.
- Non-root container user; DB/Redis/MinIO never published to the host.

## Roadmap (next layer)
- Accounts / service addresses / work-order dispatch UI.
- Invoice builder, credit notes, and the "Collect payment" (Stripe/PayPal) flow in the UI.
- Branded PDF paperwork (invoice, work order, credit note) + receipt emails.
- Barcode/QR inventory scan + before/after job photos (to MinIO).
- CI: test job gating build; deploy adds a pre-migration `pg_dump` + post-deploy health gate.
- Raw-SQL migration for partial-unique indexes (soft-delete) and the allocation XOR check.
