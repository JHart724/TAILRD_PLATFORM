---
name: Secrets rotation deferred to CTO
description: AWS keys/JWT/PHI key in git are known risk but deprioritized until CTO Bozidar Benko takes over
type: project
---

Jonathan is the only person with repo access. AWS credentials, JWT secret, and PHI encryption key committed to backend/.env are a known risk but intentionally deferred.

**Why:** Solo developer, private repo, no immediate exposure. Higher priority items exist for demo readiness.

**How to apply:** Do not repeatedly flag credential rotation as P0. When Bozidar (CTO) onboards, this becomes his day-one task: rotate all secrets, add .env to .gitignore, scrub git history, set up AWS Secrets Manager.
