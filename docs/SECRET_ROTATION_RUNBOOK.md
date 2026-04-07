# TAILRD — Secret Rotation Runbook
# Run immediately after removing terraform.tfvars from git

## Context

Secrets were committed to git in terraform.tfvars and .env files.
Git history retains these values permanently even after file deletion.
Rotation invalidates the exposed values. Run in the order below.

---

## 1. AWS Credentials (ROTATE FIRST — highest risk)

```bash
# Log into AWS Console as root or admin user
# IAM → Users → tailrd-deploy (or equivalent service account)
# Security credentials → Access keys → Create access key
# Select: Application running outside AWS
# Download the new credentials CSV immediately

# Store new credentials in AWS Secrets Manager (NOT in any file)
aws secretsmanager put-secret-value \
  --secret-id /tailrd/aws-access-key-id \
  --secret-string "<new-access-key-id>"  # from IAM console

aws secretsmanager put-secret-value \
  --secret-id /tailrd/aws-secret-access-key \
  --secret-string "..."  # new secret key

# Update local AWS config (your machine only, not committed)
aws configure
# Enter: new access key ID, new secret access key, region, output format

# Verify new credentials work
aws sts get-caller-identity

# Delete the old access key (from AWS Console or CLI)
aws iam delete-access-key --access-key-id <old-access-key-id>

# Update ECS task definition to use new Secrets Manager reference
# (if ECS tasks inject AWS credentials — check task definition)
```

---

## 2. JWT Secret (rotate before next deployment)

```bash
# Generate cryptographically strong new secret (minimum 64 bytes = 512 bits)
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "New JWT secret: $NEW_JWT_SECRET"
echo "(Copy this — do not save to any file)"

# Store in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id /tailrd/jwt-secret \
  --secret-string "$NEW_JWT_SECRET"

# ⚠️ IMPACT: All existing user sessions will be immediately invalidated.
# All logged-in users will be logged out. This is expected and acceptable.
# Schedule rotation for a low-traffic window if possible.

# Update ECS task definition to read JWT_SECRET from Secrets Manager
# (if currently passed as plaintext env var — move it to Secrets Manager reference)

# Deploy new ECS task definition
# Verify: attempt login with old JWT → should return 401
# Verify: fresh login → should return 200 with new token
```

---

## 3. PHI Encryption Key (coordinate carefully)

```bash
# ⚠️ WARNING: Rotating the PHI encryption key requires re-encrypting
# all PHI stored in the database. This is a coordinated operation
# with a maintenance window.

# Step 1: Generate new key
NEW_PHI_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "New PHI key: $NEW_PHI_KEY"
echo "(Copy this — do not save to any file)"

# Step 2: Store new key in Secrets Manager under a versioned name
aws secretsmanager put-secret-value \
  --secret-id /tailrd/phi-encryption-key-v2 \
  --secret-string "$NEW_PHI_KEY"

# Step 3: Write and test re-encryption migration script
# The script must:
#   a. Read each encrypted PHI field using the OLD key
#   b. Re-encrypt using the NEW key
#   c. Write back to database in the same transaction
#   d. Verify decryption with new key before committing

# Step 4: Test on database clone (run safe-migrate.sh first to create clone)
DATABASE_URL="postgresql://localhost/tailrd_test_clone" \
PHI_KEY_OLD="<old-key>" \
PHI_KEY_NEW="$NEW_PHI_KEY" \
  node scripts/reencrypt-phi.js

# Step 5: Run smoke tests on clone
DATABASE_URL="postgresql://localhost/tailrd_test_clone" \
PHI_ENCRYPTION_KEY="$NEW_PHI_KEY" \
  npm test -- --testPathPattern=smoke/regression --testNamePattern="PHI"

# Step 6: Schedule maintenance window
# Step 7: Run on production with both keys available
# Step 8: Verify PHI readable, update Secrets Manager to new key, retire old key
```

---

## 4. Database Password (if DATABASE_URL was exposed)

```bash
# Check: was DATABASE_URL committed to any tracked file?
git log --all --full-history -p -- .env | grep "DATABASE_URL"
git log --all --full-history -p -- terraform.tfvars | grep -i "password\|db_pass"

# If yes — rotate:
# AWS Console → RDS → Your instance → Modify → Master password → Set new password
# Apply immediately (may cause brief downtime)

# Update in Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id /tailrd/database-url \
  --secret-string "postgresql://user:NEWPASSWORD@host:5432/tailrd"

# Update ECS task definition DATABASE_URL reference
# Redeploy ECS service
# Verify: backend connects successfully → check health endpoint
```

---

## 5. Redox API Key / Webhook Secret (if exposed)

```bash
# Check if Redox credentials were committed
git log --all --full-history -p | grep -i "redox"

# If yes:
# Log into Redox dashboard → Settings → API Keys → Rotate
# Update in Secrets Manager:
aws secretsmanager put-secret-value \
  --secret-id /tailrd/redox-api-key \
  --secret-string "new-redox-api-key"

aws secretsmanager put-secret-value \
  --secret-id /tailrd/redox-webhook-secret \
  --secret-string "new-redox-webhook-secret"

# Verify: send test webhook → check HMAC validation still works
# (use the smoke test: "Redox webhook with valid HMAC returns 200")
```

---

## 6. Remove Sensitive Files from Git Tracking

```bash
# Remove terraform.tfvars from git (keep file locally, stop tracking it)
git rm --cached terraform.tfvars
git rm --cached -r .terraform/ 2>/dev/null || true

# Remove .env from git if it was tracked
git rm --cached .env 2>/dev/null || true
git rm --cached backend/.env 2>/dev/null || true

# Update .gitignore to prevent future commits
cat >> .gitignore << 'EOF'

# Secrets and credentials — never commit these
.env
.env.*
!.env.example
terraform.tfvars
terraform.tfvars.json
*.tfvars
*.tfvars.json
.terraform/
*.tfplan
terraform.tfstate
terraform.tfstate.backup
*.pem
*.key
*.p12
backups/*.sql
EOF

git add .gitignore
git commit -m "fix(SEC): remove sensitive files from git tracking

- terraform.tfvars contained AWS account ID, VPC IDs, subnet IDs
- .terraform/ contained provider binaries
- All exposed secrets have been rotated
- Values moved to AWS Secrets Manager
- .gitignore updated to prevent future exposure"

# Note: git history still contains the old values.
# The rotation above invalidates them even in history.
# If you need to scrub history (optional, disruptive):
# Use: git filter-repo --path terraform.tfvars --invert-paths
# This rewrites all history and requires force-push — coordinate with team first.
```

---

## 7. Verification Checklist

After completing all rotations:

```bash
# [ ] AWS credentials work
aws sts get-caller-identity

# [ ] Application starts with new secrets
npm start &
sleep 5
curl http://localhost:3001/api/health

# [ ] Login works (new JWT secret)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@tailrd-heart.com","password":"testpassword"}'

# [ ] PHI is still readable (new encryption key if rotated)
npm test -- --testPathPattern=smoke/regression --testNamePattern="PHI"

# [ ] Terraform can plan (new AWS credentials)
terraform plan

# [ ] No secrets in git working tree
git diff --cached | grep -E "AKIA|password\s*=|secret\s*="
# Should return nothing

# [ ] .gitignore covers all sensitive files
cat .gitignore | grep -E "\.env|tfvars|\.terraform"
```

---

*Completed: [DATE]*
*Rotated by: [INITIALS]*
*Verified by: [INITIALS]*
