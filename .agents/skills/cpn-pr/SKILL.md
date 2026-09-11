---
name: cpn-pr
description:
  "Use when opening or triaging a PR in this repo: French body from the
  template, draft-first, origin-only, review-gated."
version: 1.0.0
license: Apache-2.0
---

# Console pull requests

## Prerequisites

```bash
gh api user --jq .login # authenticated
gh api repos/cloud-pi-native/console --jq .viewerPermission # write, origin-only
git fetch origin && git rebase origin/main # current, no conflicts
```

- An issue stands behind the change — issue-first norm, no orphan PRs.
- Quality gates green — see the `cpn-dev-workflow` skill; the `pre-push`
  Husky hook already runs unit tests.

An unmet requirement is a reported blocker, never a silent scope change.

## Before opening

- Duplicate/stack check — list open PRs; if one already delivers the change,
  push there instead of opening a second. If your change depends on an open
  PR, base your branch on its branch.

```bash
gh pr list --state open --json number,title,headRefName \
  --jq '.[] | "\(.number)\t\(.title)\t\(.headRefName)"'
```

- Rebase onto `main` first: `git fetch origin && git rebase origin/main`.
  Never push a conflicted branch.
- Duplicate work is ruled out and the branch is conflict-free.

## Opening

- Branches live on the org repo itself; origin-only, no forks. `main` is
  protected; only `hotfix/*` may bypass the feature-branch rule, and the
  branch prefix matches the commit type: `feat/`, `fix/`, `docs/`, ...
- Open as **draft**, title = conventional commit subject, body =
  `.github/PULL_REQUEST_TEMPLATE.md` verbatim, in French, linking the issue
  under `Issues liées`:

```bash
gh pr create --repo cloud-pi-native/console --draft --base main \
  --head <branch> \
  --title "<type>: <subject>" \
  --body-file <body>
```

- The body is free text: natural prose, no hard wrapping, never run a
  formatter over it.
- A literal `@` in prose triggers a user/team mention — wrap it in a code
  span.

## Triage after creation

Set each empty, determinable field, additively (`--add-label` /
`--add-assignee`, never `--label`):

- **labels** — from `gh label list`, never from memory. Conventional type →
  matching label; doc changes → `docs` (this repo's real label;
  `documentation` does not exist).
- **assignee** — the author, if empty.
- **milestone** — bug → highest open patch of the current minor line;
  feature → next minor/major.
- **reviewers** — one collaborator if none requested; otherwise skip.

## After opening

- Keep it draft until review passes; a human approving review from another
  collaborator is required — never self-merge.
- CI includes the SonarQube Quality Gate. When all checks are green but
  `mergeStateStatus` is `BLOCKED`, enqueue:

```bash
gh workflow run 243523481 --repo cloud-pi-native/console -f PR_NUMBER=<N>
```

Landing once gates pass (ledger, threads, CI, human approval): `cpn-land`.
