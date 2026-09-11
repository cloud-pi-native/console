---
name: cpn-delegate
description:
  "Use when isolating one unit of work in a fresh git worktree — the default
  working surface for every implementation unit."
version: 1.0.0
license: Apache-2.0
---

# Console work isolation

One unit of work = one worktree off `origin/main`. A checkout holding
unrelated work in progress is never the editing surface.

## Procedure

1. Open the worktree off the remote tip — a sibling of the repo root, never
   inside it:

```bash
cd ~/Source/Repos/github.com/cloud-pi-native/console
git worktree add ../console.<topic> -b <branch> origin/main
cd ../console.<topic>
```

- `<branch>` = `<type>/<slug>`, prefix matching the commit type
  (`feat/vault-rotation`, `docs/repo-skills`).
- Pin `origin/main`, never local `main` (stale).
- `pnpm install` in the worktree: Husky hooks and deps are per-worktree.

2. Implement, commit per `cpn-commit` — one logical change.

3. Push, then hand off to `cpn-pr` (draft, French body, issue linked):

```bash
git push -u origin <branch>
```

## After landing

```bash
cd ~/Source/Repos/github.com/cloud-pi-native/console
git worktree remove ../console.<topic>
git branch -d <branch>
git fetch --prune
```

## Pitfalls

- `rm -rf` on a worktree holding uncommitted work — WIP loss;
  `git worktree remove` refuses unless clean.
- Basing on local `main` — rebase onto `origin/main` before pushing
  (`cpn-pr`).
- Two units in one worktree — out-of-scope fixes become follow-up issues
  (`cpn-dev-workflow`).

## Verify

```bash
git worktree list
git status --porcelain # clean before switching units
```

## See also

`cpn-dev-workflow` (lifecycle, quality gates) · `cpn-commit` · `cpn-pr` ·
`cpn-merge` (landing, cleanup).
