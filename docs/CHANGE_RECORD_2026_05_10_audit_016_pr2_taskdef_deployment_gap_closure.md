# CHANGE RECORD — 2026-05-10 — AUDIT-016 PR 2 task-def deployment gap closure (revision 183)

**Date:** 2026-05-10 (operator-side execution 11:50:58 -0700 register; 11:51:00 -0700 deploy; 11:52:30 -0700 health-verified)
**Operator:** Jonathan Hart (CEO/Founder)
**Principal:** arn:aws:iam::863518424332:user/tailrd-cli-access
**Sub-arc:** β1 single-arc Pre-Phase-1 (AUDIT-084 RESOLVED)
**PR:** #268

## Trigger

AUDIT-016 PR 2 (merge SHA 092658b 2026-05-07T20:34:52 -0700) shipped envelope-emission infrastructure assuming task-def env wiring; production task def at PR-merge time was tailrd-backend:123 which lacked PHI_ENVELOPE_VERSION + AWS_KMS_PHI_KEY_ALIAS env vars; gap persisted ~2 days across 59 task-def revisions (:124 through :182) due to CI-driven deploy cadence preserving the env-var omission.

## Production-side actions

1. Step P3: `aws ecs register-task-definition --cli-input-json file://C:/tmp/task-def-183-draft.json` → revision 183 ACTIVE
2. Step P5: `aws ecs update-service --cluster tailrd-production-cluster --service tailrd-production-backend --task-definition tailrd-backend:183 --force-new-deployment` → deployment ecs-svc/9130118381098689272 IN_PROGRESS
3. Step P6: Poll loop ~6 iters × 15 sec → rolloutState COMPLETED ~1.5 min wall-clock
4. Step P7: `curl https://api.tailrd-heart.com/api/health` → HTTP 200; uptime 201s; version 1.0.0; environment production
5. Step P8: `aws ecs describe-task-definition --task-definition tailrd-backend:183 --query "containerDefinitions[0].environment[?name=='PHI_ENVELOPE_VERSION' || name=='AWS_KMS_PHI_KEY_ALIAS' || name=='PHI_LEGACY_PLAINTEXT_OK']"` → all 3 env vars confirmed active

## State delta

- BEFORE: production task def tailrd-backend:182; image fdb54e5; lacked PHI_ENVELOPE_VERSION + AWS_KMS_PHI_KEY_ALIAS
- AFTER: production task def tailrd-backend:183; image fdb54e5 (unchanged); PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi + PHI_LEGACY_PLAINTEXT_OK=false (preserved verbatim)

## Rollback (if needed)

`aws ecs update-service --cluster tailrd-production-cluster --service tailrd-production-backend --task-definition tailrd-backend:182 --force-new-deployment` reverts to prior revision. Not invoked; not needed.

## DRIFT codifications (this sub-arc)

DRIFT-13 through DRIFT-24 (12 entries). See docs/audit/AGENT_DRIFT_REGISTRY.md.

## Cross-references

- AUDIT-084 (this finding)
- AUDIT-016 PR 2 (gap origin)
- AUDIT-016 PR 3 (gated on this PR merge)
- §17.3 scope discipline (separate sign-off PR per work-block)
- HIPAA §164.312(a)(2)(iv) encryption-at-rest
