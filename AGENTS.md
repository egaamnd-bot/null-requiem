# Agent instructions — NULL REQUIEM

This file is the entry point for any AI developer (Claude, ChatGPT/Codex, others). It deliberately stays short; the
real project state lives in `docs/`.

## Start of every session

1. Read `docs/AI_HANDOVER.md` (canonical current state and the one next action).
2. Read the latest entries of `docs/DEVLOG.md`, then `docs/ROADMAP.md` and `docs/QA_STATUS.md`.
3. Inspect the real state before trusting the docs: `git status`, current branch and HEAD, open PRs, latest CI runs.
4. Continue the existing work. Do not restart finished work or discard another agent's changes without reading them.

## Before ending a session or switching agents

Update all four docs (`AI_HANDOVER`, `DEVLOG`, `ROADMAP`, `QA_STATUS`) so they match the code. Record the branch,
HEAD SHA, PR and CI run URLs, commands actually run and their real results, and mark each claim as verified,
inferred or unverified. Never claim something was pushed, tested or device-verified without evidence.

## Rules

- Branch-based, small, reviewable changes. Never weaken CI or repo security to make a check pass.
- Add a regression test with every bug fix when feasible.
- Do not put credentials, tokens or `.env` contents in the repo or in docs.
- Physical-device results exist only if the Producer reports them; automated checks are not device tests.
- Commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` (needs `npx playwright install chromium`).
