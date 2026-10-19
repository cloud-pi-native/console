---
name: cpn-dev-workflow
description:
  "Use when contributing to this repo: issue-first lifecycle, workspace
  isolation, quality gates, PR workflow, or local Playwright E2E testing."
license: Apache-2.0
metadata:
  version: '1.1.0'
---

# Console dev workflow

## Stack

- pnpm monorepo, Node >= 26, pnpm >= 11.8
- Backend target: `apps/server-nestjs`. `apps/server` is frozen (read-only
  reference) — never modify it.
- Git-backed repository: work on feature branches off `origin/main`;
  `main` is protected.

## Prerequisites

```bash
gh api user --jq .login # authenticated
gh api repos/cloud-pi-native/console --jq .viewerPermission # need write
node --version && pnpm --version # Node >= 26, pnpm >= 11.8
git status --porcelain # clean checkout
```

An unmet requirement is a reported blocker, never a silent scope change.

## Lifecycle

Lifecycle: discussion → issue → issue comments → PR. No PR without an issue
behind it; no bare-request implementation.

1. **One issue per item.** Bug `🐛 [BUG] - <summary>` / feature
   `💡 [REQUEST] - <summary>`, via `.github/ISSUE_TEMPLATE/`. Body = problem
   statement plus a `- [ ]` acceptance tasklist, Définition du fini — never
   the solution; analysis goes in comments. Search existing issues before
   creating.
2. **Triage before work**: set each empty, determinable field — labels
   from `gh label list`, never invented; assignee; milestone: bug → highest
   open patch of the current minor line, feature → next minor/major.
3. **Branch from `origin/main`**, implement, commit.
4. **Draft PR** linked to the issue.
5. **Human approving review is the merge gate** — do not self-merge.
6. **Close deliberately**: verify every acceptance box, then close the issue
   with an evidence comment. Never rely on PR-merge auto-close.

Written artifacts — issues, PR bodies, comments — stay terse: one statement
per fact, no rephrasing, no filler. Inflation buries signal.

Details live in the `cpn-issue`, `cpn-commit`, `cpn-pr`, `cpn-review`,
`cpn-merge`, and `cpn-delegate` skills.

## Isolation

- One logical change per branch and PR; out-of-scope fixes become follow-up
  issues.
- When the current checkout holds unrelated work in progress, isolate in a
  fresh git worktree (`cpn-delegate`) instead of mixing:

```bash
git worktree add ../console.<topic> -b <branch> origin/main
```

## Verify

Before opening the PR:

```bash
pnpm format
pnpm lint
pnpm test # targeted specs at minimum
```

Run the full Playwright E2E suite when the change affects browser flows, API data, routing,
authentication, or E2E fixtures. The suite requires the CI stack and its seeded data; never run it
against `docker:dev`.

If a development stack is active, stop it with `pnpm docker:dev:clean` before starting CI because
both Compose configurations share container names and ports. If required `.env` files are missing,
run `bash ci/scripts/init-env.sh`; it copies templates without overwriting existing files.

Use the single E2E runner, then clean up even when the tests fail:

```bash
pnpm docker:e2e-ci
pnpm docker:e2e-ci:delete
```

## Pitfalls

- A responsive application stack is not proof that E2E fixtures are provisioned. `docker:dev` may start normally while E2E assumptions fail later; use `docker:e2e-ci` for the full suite.
