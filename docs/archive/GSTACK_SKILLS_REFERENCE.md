# Gstack Skills Reference (archived)

Moved out of `CLAUDE.md` on 2026-06-01 to keep the always-loaded project-instruction file under the 40k TUI performance threshold. The live skill list is injected into the session by the harness each turn, so this table is reference convenience, not load-bearing. The browser rule and the skill-routing rules remain inline in `CLAUDE.md`.

| Skill | When to use |
|-------|-------------|
| `/office-hours` | Product ideas, brainstorming, YC-style forcing questions |
| `/plan-ceo-review` | Product strategy and scope decisions |
| `/plan-eng-review` | Before starting any major feature |
| `/plan-design-review` | Designer's eye plan review |
| `/plan-devex-review` | Developer experience plan review |
| `/design-consultation` | Design system, brand, aesthetic direction |
| `/design-shotgun` | Generate multiple design variants for comparison |
| `/design-html` | Production-quality HTML/CSS from approved designs |
| `/review` | After any significant change, before PRs |
| `/ship` | Deploy, push, create PR |
| `/land-and-deploy` | Merge PR, wait for CI, verify production |
| `/canary` | Post-deploy canary monitoring |
| `/benchmark` | Performance regression detection |
| `/browse` | Visual QA, site dogfooding, headless browser |
| `/connect-chrome` | Launch AI-controlled visible Chromium |
| `/qa` | Test the site, find and fix bugs |
| `/qa-only` | Report-only QA (no fixes) |
| `/design-review` | Visual audit, design polish |
| `/setup-browser-cookies` | Import cookies for authenticated testing |
| `/setup-deploy` | Configure deployment settings |
| `/retro` | Weekly engineering retrospective |
| `/investigate` | Debug errors, root cause analysis |
| `/document-release` | Post-ship documentation update |
| `/codex` | OpenAI Codex review, challenge, or consult |
| `/cso` | Security audit (OWASP, STRIDE, secrets, supply chain) |
| `/autoplan` | Auto-review pipeline (CEO + design + eng + DX) |
| `/devex-review` | Live developer experience audit |
| `/careful` | Safety guardrails for destructive commands |
| `/freeze` | Restrict edits to a specific directory |
| `/guard` | Full safety mode (careful + freeze) |
| `/unfreeze` | Clear freeze boundary |
| `/checkpoint` | Save and resume working state |
| `/health` | Code quality dashboard |
| `/learn` | Manage project learnings |
| `/gstack-upgrade` | Upgrade gstack to latest version |

If gstack skills are not working, run:
```bash
cd .claude/skills/gstack && ./setup
```
