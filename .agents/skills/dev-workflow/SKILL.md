---
name: dev-workflow
description:
  "Use when contributing to this repo: issue-first lifecycle, workspace
  isolation, quality gates, and the PR workflow."
version: 1.0.0
license: Apache-2.0
---

# Console dev workflow

## Stack

- pnpm monorepo, Node >= 26, pnpm >= 11.8
- Backend target: `apps/server-nestjs`. `apps/server` is frozen (read-only
  reference) — never modify it.
- jj-backed repository: the working copy is a commit. Never `git commit`;
  describe with `jj describe` / `jj new`, inspect with `jj log` / `jj diff`.

## Lifecycle (issue-first, mandatory)

Lifecycle: discussion → issue → issue comments → PR. No PR without an issue
behind it; no bare-request implementation.

1. **One issue per item.** Bug `🐛 [BUG] - <summary>` / feature
   `💡 [REQUEST] - <summary>`, via `.github/ISSUE_TEMPLATE/`. Body = problem
   statement (need, scope, impact) plus a `- [ ]` acceptance tasklist
   (Définition du fini) — never the solution; analysis goes in comments.
   Search existing issues before creating.
2. **Triage before work**: set each empty, determinable field — labels
   filtered against `gh label list` (never invent one), assignee, milestone
   (bug → highest open patch of the current minor line; feature → next
   minor/major).
3. **Branch from `origin/main`**, implement, commit (see the `commit` skill).
4. **Draft PR** linked to the issue (see the `pull-request` skill).
5. **Human approving review is the merge gate** — do not self-merge.
6. **Close deliberately**: verify every acceptance box, then close the issue
   with an evidence comment. Never rely on PR-merge auto-close.

## Isolation

- One logical change per branch and PR; out-of-scope fixes become follow-up
  issues.
- When the current checkout holds unrelated work in progress, isolate in a
  fresh jj workspace instead of mixing:

```bash
jj workspace add ../console.<topic> -r 'main@origin'
```

## Quality gates (before any PR)

```bash
pnpm format
pnpm lint
pnpm test          # targeted specs at minimum
pnpm playwright:test   # only if a user journey is affected
```

## Validate the environment before work

```bash
gh api user --jq .login
gh api repos/cloud-pi-native/console --jq .viewerPermission   # need write
node --version && pnpm --version
jj status
```

An unmet requirement is a reported blocker, never a silent scope change.
