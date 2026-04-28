# Day 9 - Wix DNS handoff

**Created:** 2026-04-27
**Operator (manual Wix UI step):** Jonathan Hart
**Companion plan:** `docs/DAY_9_PLAN.md`

---

## Why this doc exists

The domain `tailrd-heart.com` is authoritative on Wix (the Route 53 hosted zone is a shadow copy - see tech debt #22). All DNS edits for staging happen via the Wix DNS UI, manually. This doc is the structured handoff so Jonathan can copy-paste each record without ambiguity.

Two records total:

1. **Record 1 - ACM cert validation CNAME** (add **NOW**, Monday afternoon, before Tuesday's stack create)
2. **Record 2 - staging-api subdomain CNAME** (add **Tuesday after CF deploy**, when the ALB DNS name exists)

---

## Record 1 - ACM cert validation (add now)

**Status to verify before adding:** ACM certificate is `PENDING_VALIDATION` waiting on this DNS record.

| Field | Value |
|---|---|
| **Type** | `CNAME` |
| **Host name** (Wix UI) | `_5fec0c6f2c1892b9d4f8408f0db70019.staging-api` |
| **Points to** (Wix UI) | `_cd1905d4202daf7ae44c53fe56e1116e.jkddzztszm.acm-validations.aws.` |
| **TTL** | 300 (5 min) |

> **Wix UI guidance:**
> Wix DNS Settings → Add a record → Type: CNAME. Some Wix tenants require entering only the host portion (`_5fec0c6f2c1892b9d4f8408f0db70019.staging-api`), others want the full FQDN. If Wix rejects with "invalid" try removing the trailing `.tailrd-heart.com.` if present, or adding it if missing. The "Points to" value MUST end in a trailing dot per CNAME specification - Wix may auto-add or auto-strip; confirm by re-reading the saved record.

**Verification after save (~5-15 min for DNS propagation):**

```bash
nslookup -type=CNAME _5fec0c6f2c1892b9d4f8408f0db70019.staging-api.tailrd-heart.com
```

Expected: returns `_cd1905d4202daf7ae44c53fe56e1116e.jkddzztszm.acm-validations.aws.`

**ACM cert auto-validates within ~5-15 min after DNS propagation. To check:**

```bash
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:863518424332:certificate/a13fe1f5-5999-410d-bc08-92d063579e7a --query 'Certificate.Status'
```

Expected progression: `PENDING_VALIDATION` → `ISSUED`.

---

## Record 2 - staging-api subdomain (add Tuesday post-CF deploy)

**DO NOT ADD UNTIL:** Tuesday's `aws cloudformation create-stack tailrd-staging` completes (~15-25 min) and the ALB DNS name is in the stack outputs.

| Field | Value |
|---|---|
| **Type** | `CNAME` |
| **Host name** (Wix UI) | `staging-api` |
| **Points to** (Wix UI) | `<ALB-DNS-NAME-FROM-CF-OUTPUT>` (e.g., `tailrd-staging-alb-1234567890.us-east-1.elb.amazonaws.com`) |
| **TTL** | 300 |

**How to fetch the ALB DNS name on Tuesday:**

```bash
aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`AlbDnsName`].OutputValue' --output text
```

**Verification after save:**

```bash
nslookup staging-api.tailrd-heart.com
# Expected: resolves to the ALB DNS, which resolves to the ALB's public IP(s)

curl -I https://staging-api.tailrd-heart.com/health
# Expected: HTTP/2 200 (after ECS service comes up healthy)
```

---

## Cert ARN reference (for CF stack create on Tuesday)

```
arn:aws:acm:us-east-1:863518424332:certificate/a13fe1f5-5999-410d-bc08-92d063579e7a
```

Pass this as the `CertificateArn` parameter to `aws cloudformation create-stack` per `docs/DAY_9_PLAN.md` Task 4.

---

## Cleanup

Once Day 9 is complete + accepted, this handoff doc can either:
- Stay as a runbook for any future staging DNS changes
- Or fold into `docs/DAY_9_PLAN.md` as a closed-out appendix

Either way, the Tuesday Record-2 addition becomes a one-time event; long-term the staging-api CNAME just exists.
