# AGENTS.md: Rules for all AI assistants (Tsukuyomi Watch)

## Ownership (never edit outside your folder)
- Frontend: frontend/
- Backend: backend/app/ (except backend/app/ai/), backend/tests/,
  backend/requirements.txt, backend/requirements-dev.txt
- AI: backend/app/ai/, backend/requirements-ai.txt
- Shared (integration owner, PR only): docs/, AGENTS.md, README.md, .gitignore,
  .env.example, .github/
- docs/api-contracts.md changes need a PR approved by all three members.

## Interfaces
- Backend routes call backend/app/ai/service.py (restore_image, detect_sources).
  AI never edits routes. Backend never edits backend/app/ai/.
- Frontend only talks to the API described in docs/api-contracts.md.

## Branches
- One branch per task. After a PR is merged never reuse that branch.
- Task list and prompts: docs/PLAYBOOK.md. Use Python 3.11 or 3.12.

## Contract
- `docs/api-contracts.md` is the single source of truth for API shapes.
- Never change field names or units on your own. Ask the human to agree the change with the others first.
- Frontend uses mock data that exactly matches the contract and labels it "MOCK".

## Git rules
- Work only on your assigned feature branch. Never touch `main`.
- Before starting: `git pull --ff-only` on main, then merge main into your branch.
- Commit small, and stage only files you changed (no `git add .`).
- Never: force-push, hard reset, `git init`, change remotes, delete branches, merge, or deploy.
- Ask the human for approval before every commit and push.

## Safety
- Never commit `.env`, keys, `node_modules`, `.venv`, model weights or outputs.
- Secrets only via local environment variables.
- Do not add new dependencies without telling the human.

## Science rules
- Keep the original image; never overwrite it.
- Label restored images and detections as "candidates", not facts.
- Do not claim real star identity, physical size or calibrated brightness.
- Never present mock or sample values as live data.

## Every session
1. Read this file and `docs/`.
2. Run `git status` and check the current branch.
3. Propose the smallest next step and wait for approval.
4. After the work, show changed files and test results.