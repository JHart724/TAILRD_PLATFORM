#!/bin/bash
# TAILRD — Pre-Merge Verification Script
# Run before opening any PR during the remediation sprint
# Usage: ./scripts/pre-merge-check.sh
# Exit code 0 = ready to merge, Exit code 1 = fix issues first

set -e

PASS=0
FAIL=0
WARN=0

pass() { echo "  ✅ $1"; ((PASS++)); }
fail() { echo "  ❌ $1"; ((FAIL++)); }
warn() { echo "  ⚠️  $1"; ((WARN++)); }

echo "═══════════════════════════════════════════════"
echo "TAILRD PRE-MERGE VERIFICATION"
echo "Branch: $(git branch --show-current)"
echo "═══════════════════════════════════════════════"

# ── TypeScript ──────────────────────────────────────
echo ""
echo "[ 1/7 ] TypeScript compilation..."
if npm run tsc --noEmit 2>/dev/null; then
  pass "No TypeScript errors"
else
  fail "TypeScript errors found — fix before merging"
fi

# ── Smoke tests ─────────────────────────────────────
echo ""
echo "[ 2/7 ] Smoke test suite..."
if npm test -- --testPathPattern=smoke --ci --forceExit 2>/dev/null; then
  pass "All smoke tests passing"
else
  fail "Smoke tests failing — do not merge until all green"
fi

# ── Rogue PrismaClient instances ────────────────────
echo ""
echo "[ 3/7 ] PrismaClient singleton check..."
ROGUE_CLIENTS=$(grep -r "new PrismaClient()" \
  --include="*.ts" backend/ \
  | grep -v "lib/prisma.ts" \
  | grep -v "node_modules" \
  | wc -l | tr -d ' ')
if [ "$ROGUE_CLIENTS" -eq 0 ]; then
  pass "Only one PrismaClient instance (lib/prisma.ts)"
else
  fail "Found $ROGUE_CLIENTS rogue PrismaClient instances — all must use shared singleton"
  grep -r "new PrismaClient()" --include="*.ts" backend/ \
    | grep -v "lib/prisma.ts" | grep -v "node_modules" | head -10
fi

# ── Hardcoded secrets ────────────────────────────────
echo ""
echo "[ 4/7 ] Secret scanning (staged files)..."
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || git diff HEAD --name-only)

SECRET_PATTERNS=(
  "AKIA[A-Z0-9]{16}"
  "sk-[a-zA-Z0-9]{20,}"
  "password\s*=\s*['\"][^'\"]{8,}['\"]"
  "secret\s*=\s*['\"][^'\"]{8,}['\"]"
  "eyJhbGciOiJIUzI"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  MATCHES=$(git diff --cached 2>/dev/null | grep -E "$pattern" | wc -l | tr -d ' ')
  if [ "$MATCHES" -gt 0 ]; then
    fail "Potential secret pattern found in diff: $pattern"
    ((SECRETS_FOUND++))
  fi
done
if [ "$SECRETS_FOUND" -eq 0 ]; then
  pass "No obvious secrets in staged changes"
fi

# ── Console.log in critical paths ───────────────────
echo ""
echo "[ 5/7 ] Console.log in critical paths..."
CONSOLE_IN_AUTH=$(grep -n "console\.log" backend/auth.ts 2>/dev/null | wc -l | tr -d ' ')
CONSOLE_IN_GAPS=$(grep -n "console\.log" backend/gapDetectionRunner.ts 2>/dev/null | wc -l | tr -d ' ')
CONSOLE_IN_PHI=$(grep -n "console\.log" backend/lib/phiEncryption.ts 2>/dev/null | wc -l | tr -d ' ')

if [ "$CONSOLE_IN_AUTH" -gt 0 ]; then
  warn "console.log found in auth.ts ($CONSOLE_IN_AUTH instances) — verify no PHI logged"
fi
if [ "$CONSOLE_IN_GAPS" -gt 0 ]; then
  warn "console.log found in gapDetectionRunner.ts ($CONSOLE_IN_GAPS instances)"
fi
if [ "$CONSOLE_IN_PHI" -gt 0 ]; then
  fail "console.log found in phiEncryption.ts ($CONSOLE_IN_PHI instances) — PHI exposure risk"
fi
if [ "$CONSOLE_IN_AUTH" -eq 0 ] && [ "$CONSOLE_IN_GAPS" -eq 0 ] && [ "$CONSOLE_IN_PHI" -eq 0 ]; then
  pass "No console.log in auth, gap detection, or encryption paths"
fi

# ── Merge conflicts ──────────────────────────────────
echo ""
echo "[ 6/7 ] Merge conflict markers..."
CONFLICTS=$(grep -r "<<<<<<< " --include="*.ts" --include="*.tsx" . \
  2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$CONFLICTS" -eq 0 ]; then
  pass "No merge conflict markers found"
else
  fail "Found $CONFLICTS files with merge conflict markers — resolve before merging"
  grep -rl "<<<<<<< " --include="*.ts" --include="*.tsx" . \
    | grep -v node_modules | head -5
fi

# ── @ts-nocheck ─────────────────────────────────────
echo ""
echo "[ 7/7 ] @ts-nocheck additions..."
NEW_NOCHECK=$(git diff --cached 2>/dev/null | grep "^+" | grep "@ts-nocheck" | wc -l | tr -d ' ')
if [ "$NEW_NOCHECK" -eq 0 ]; then
  pass "No new @ts-nocheck directives added"
else
  fail "Found $NEW_NOCHECK new @ts-nocheck directives — fix the types instead"
fi

# ── Summary ─────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "PRE-MERGE RESULTS"
echo "  ✅ Passed: $PASS"
echo "  ⚠️  Warnings: $WARN"
echo "  ❌ Failed:  $FAIL"
echo "═══════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "NOT READY TO MERGE — fix $FAIL failing check(s) first"
  echo ""
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo ""
  echo "READY TO MERGE — review $WARN warning(s) before proceeding"
  echo ""
  exit 0
else
  echo ""
  echo "READY TO MERGE — all checks passed"
  echo ""
  exit 0
fi
