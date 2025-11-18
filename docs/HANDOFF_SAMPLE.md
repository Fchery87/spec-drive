# HANDOFF.md (Sample)

This sample illustrates the tone, structure, and depth we generate for handoffs. Swap the placeholder values with your project-specific data.

---

# SpecDrive Payments API — Project Handoff

## Project Overview
- **Project Name**: SpecDrive Payments API
- **Description**: Unified payments orchestration service with PCI-safe tokenization.
- **Current Phase**: solutioning
- **Phases Completed**: discovery, analysis, spec, architecture
- **Generated**: 2024-11-04

## Executive Summary
Deliver a resilient payments layer that abstracts processors, enforces idempotent operations, and preserves auditability. MVP targets card payments with roadmap support for ACH and wallets.

## Success Criteria
- REQ-FUNC-001 to REQ-FUNC-012 implemented and validated
- P99 latency under 250ms for charge/create and refund flows
- 0 critical/major vulns in pre-prod scans
- Traceability from requirements → tests → deployment artifacts

## Technology Stack
- **API**: Node.js/Express, TypeScript, REST (OpenAPI)
- **Data**: PostgreSQL (Neon), Drizzle ORM
- **AuthN/Z**: Better Auth, JWT access tokens
- **UI**: Vite + React, Tailwind + shadcn/ui
- **Observability**: Sentry, structured logs (winston)

## Requirements Snapshot
- **REQ-FUNC-001**: Create charge with idempotency and currency enforcement
- **REQ-FUNC-005**: Issue refund with partial support and status reconciliation
- **REQ-NFR-003**: Encrypt PAN and store tokens only (no raw PAN persistence)
- **REQ-NFR-007**: p95 latency <200ms; p99 <250ms on primary flows

## Architecture Overview
- **Pattern**: API-first, modular service with queue-backed webhooks
- **Ingress**: REST endpoints behind rate limiting + auth middleware
- **Core modules**: tokenization, charge submission, refund orchestration, webhook verifier
- **Data**: Payments, Customers, Tokens, WebhookEvents
- **Integrations**: Processor adapters (Stripe first), outbound webhooks

## Development Guide (condensed)
```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```
- Branching: trunk-based with short-lived feature branches
- Reviews: 1 reviewer minimum; tests/lint required via CI
- Definition of Done: requirements mapped, tests passing, SLOs respected

## Deployment Guide (condensed)
- **Environments**: staging → prod
- **Env vars**: DATABASE_URL, JWT_SECRET, STRIPE_KEY, WEBHOOK_SECRET
- **CI/CD**: GitHub Actions → staging; manual approval → prod
- **Health**: `/healthz` (app), `/readyz` (deps)

## Validation & Quality
- **Automated**: unit (Jest), integration (supertest), smoke on deploy
- **Manual**: UAT checklist for create/refund flow and webhook verification
- **Performance**: k6 smoke against primary endpoints
- **Security**: linted dependencies, secret scanning, authz checks on all mutating routes

## Traceability Matrix (excerpt)
- REQ-FUNC-001 → tests/api/charges.spec.ts → routes/charges.ts#createCharge
- REQ-FUNC-005 → tests/api/refunds.spec.ts → routes/refunds.ts#createRefund
- REQ-NFR-007 → k6/perf-smoke.js → SLO dashboard

## Appendices
- **Glossary**: PAN (Primary Account Number), SLO (Service Level Objective), UAT (User Acceptance Testing)
- **Contacts**: Eng lead (eng-lead@specdrive.app), QA (qa@specdrive.app)
