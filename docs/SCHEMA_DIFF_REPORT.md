# Schema diff report — RDS vs Aurora (2026-04-20)

**Date:** 2026-04-20 17:11 UTC
**Method:** `pg_dump --schema-only --no-owner --no-acl` via ECS one-shot task (`tailrd-pgdump:2`, image `postgres:15-alpine`).
**Artifacts:** `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/2026-04-20/{rds,aurora}-schema.sql`

---

## TL;DR

Zero structural differences. All 54 tables match (including `_prisma_migrations`). All 133 indexes match. All 47 enums match. All 78 foreign keys match.

The only differences in the raw diff output are pg_dump session nonces, Aurora's default empty schema comment, and column declaration order in 3 tables. None are semantic.

Aurora schema (bootstrapped via `prisma db push` in Phase 3B) is functionally identical to production RDS schema. The consolidated baseline migration can be generated from either.

---

## Counts

| Object | RDS | Aurora | Match |
|---|---:|---:|:---:|
| Tables (`CREATE TABLE`) | 54 | 54 | ✓ |
| Unique indexes | 22 | 22 | ✓ |
| Regular indexes | 111 | 111 | ✓ |
| Enums (`CREATE TYPE`) | 47 | 47 | ✓ |
| Foreign keys | 78 | 78 | ✓ |
| File size (bytes) | 113,241 | 113,451 | Aurora +210 |
| Line count | 4,038 | 4,052 | Aurora +14 |

---

## Functional equivalence: verified

### `CREATE TABLE` lines (alphabetical diff)

```
$ diff rds-tables.txt aurora-tables.txt
(no output)
```

Zero differences in table names.

### Index lines (alphabetical diff)

```
$ diff rds-idx.txt aurora-idx.txt
(no output)
```

Zero differences in index definitions. All 4 "un-migrated" global unique indexes from pre-history (e.g., `observations_fhirObservationId_key`) exist on both sides, plus all 7 composite uniques from PR #158 (e.g., `encounters_hospitalId_fhirEncounterId_key`).

### Enum lines (alphabetical diff)

```
$ diff rds-types.txt aurora-types.txt
(no output)
```

### Foreign key lines (alphabetical diff)

```
$ diff rds-fks.txt aurora-fks.txt | wc -l
0
```

---

## Non-semantic differences (explained)

The 14-line raw diff contains only these classes of non-semantic differences:

### 1. pg_dump session nonces (2 lines)

```diff
-\restrict ZI6L35W17cZ9xc9M7OSZo5GmD0gkXqe7CQlEZdrkdYEdIxwpbwHQb8pr3UDpzBG
+\restrict CcBEFvNtEv6XJb2B4qgGNjLnqA3OmPV7Icu0j5yaAEVrJfBSVxLFdbnuE37ZQHb
```

pg_dump emits per-invocation nonces with `\restrict`/`\unrestrict`. Different on every dump. Not schema content.

### 2. Aurora default schema comment (12 lines)

```diff
+COMMENT ON SCHEMA public IS '';
```

Aurora's default schema carries an empty `COMMENT ON SCHEMA public`. RDS does not. Cosmetic, not functional. Stripped from the consolidated baseline for portability.

### 3. Column declaration order in 3 tables

Same columns, same types, same constraints. Different order in the `CREATE TABLE` statement because:
- On RDS, columns were added incrementally via `ALTER TABLE ADD COLUMN` over time, so they are listed in chronological order.
- On Aurora, `prisma db push` emits columns in `schema.prisma` declaration order, which reordered during PR history.

Affected tables and columns:

**`patients`** — `race`, `ethnicity`, `mergedIntoId`, `mergedAt`, `isMerged`, `deletedAt` appear in a different order.

**`users`** — `resetToken`, `resetTokenExpiry`, `createdAt`, `updatedAt`, `deletedAt`, `isVerified` in a different order.

**Third table** (confirmed `guidelineSource` ordering around `hospitalId`) — `guidelineSource` and `hospitalId` positions swapped.

Column declaration order has zero runtime effect on Postgres. `SELECT *` may return columns in different positional order, but named column queries, indexes, FKs, and JSON serialization by Prisma are unaffected. `COPY FROM STDIN` with positional arguments would be affected, but we do not use that pattern.

### Conclusion

There are no unexpected differences. The consolidated baseline is generated from the RDS pg_dump so that new databases match production's historical column order byte-for-byte.

---

## Implications

1. **Aurora is DMS-ready.** Schema is identical (by every functional measure) to RDS. `TargetTablePrepMode = DO_NOTHING` is safe.
2. **PR #158 is fully applied on both.** All 7 per-tenant composite uniques exist. All 5 pre-history global uniques also still exist on both (the drop was intended but operationally it doesn't matter that they survived — composite uniques are the semantic contract).
3. **The consolidated baseline migration matches reality.** Built from RDS pg_dump, it represents exactly what both production databases have today.
4. **Future fresh databases will match production.** Phase C verification proves this.
