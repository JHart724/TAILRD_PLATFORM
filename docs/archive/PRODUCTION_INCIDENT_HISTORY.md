# Production Incident History (archived)

Moved out of `CLAUDE.md` on 2026-06-01 to keep the always-loaded project-instruction file under the 40k TUI performance threshold. The load-bearing distillation of these incidents lives inline in `CLAUDE.md` as the Deployment Rules (RULE 1-9) under section 15; this file preserves the narrative post-mortems for institutional memory.

## April 7, 2026 - ~4 hour outage during Phase 1 remediation sprint

**Root causes:** `var newToken` in auth.ts, schema migration before matching image, `tsc || true` suppressing 28 errors, CI using force-new-deployment without new task def.

**Resolution:** Fixed var to let, removed tsc||true, added prisma migrate to CMD, updated CI, fixed all TS errors.

**Prevention:** Local container test before every push.

## April 8, 2026 - All endpoints returning 500 after Phase 1 deploy

**Root cause:** CORS origin callback in `server.ts:79` blocked requests without an `Origin` header in production (`!origin && NODE_ENV !== 'production'`). Every non-browser request (curl, ALB health checks) hit `new Error('Not allowed by CORS')` -> global error handler -> 500.

**Resolution:** PR #59 removed the production-only restriction. CORS is a browser mechanism; requests without Origin headers should always pass.

**Compounding factor:** Deploy workflow used `force-new-deployment` without registering a new task def, so the fix image was not picked up until task def 10 was manually registered.

**Prevention:** Deploy workflow now registers a new task def per commit.
