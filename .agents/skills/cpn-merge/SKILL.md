---
name: cpn-merge
description:
  "Use when merging a reviewed PR in this repo: DoD ledger, threads, CI, and
  human approval gates, then squash-merge."
version: 1.0.0
license: Apache-2.0
---

# Console PR landing

Landing only — never opens (`cpn-pr`), reviews, or reconciles (`cpn-review`)
here.

## Gates (all mandatory, in order)

**1 — Ledger discharged.** Every `- [ ]` of the linked issue's Définition du
fini is checked with evidence. An unchecked box blocks the merge:

```bash
gh issue view <N> --repo cloud-pi-native/console --json body --jq .body
```

**2 — Threads reconciled.** Every inline review thread resolved — the
`Reconcile` section of `cpn-review`. An open thread blocks.

**3 — CI green.**

```bash
gh pr checks <M> --repo cloud-pi-native/console
```

**4 — Human approval on the current head.** An approval bound to an older
head does not count; re-request review after any push:

```bash
R=cloud-pi-native/console; M=<PR>
HEAD=$(gh pr view "$M" -R "$R" --json headRefOid -q .headRefOid)
gh api "repos/$R/pulls/$M/reviews" --paginate \
  --jq 'map(select(.state == "APPROVED" and .commit_id == "'"$HEAD"'")) | length > 0'
```

Never self-merge. `--admin` bypasses branch mechanics only — never this gate.

**5 — Conventions.** Conventional commit subject (`cpn-commit`), PR body in
French from the template (`cpn-pr`), `Refs #N` present. Fix before merging.

## Merge

One squash-merge per PR, base `main`. **Watch and merge are two separate
steps** — never one chained command; a merge that fires unattended lands on
stale gates.

Step 1 — watch, observe only:

```bash
gh run watch --exit-status --repo cloud-pi-native/console \
  $(gh run list --repo cloud-pi-native/console --branch <branch> --limit 1 \
    --json databaseId -q '.[0].databaseId')
```

Step 2 — re-verify the gates on the current head, then merge pinned to it:

```bash
HEAD=$(gh pr view <M> --repo cloud-pi-native/console --json headRefOid -q .headRefOid)
gh pr merge <M> --repo cloud-pi-native/console --squash --match-head-commit "$HEAD"
```

Every check green but the merge refused (`mergeStateStatus` `BLOCKED`) →
enqueue the SonarQube gate first (`cpn-pr` · After opening). Stacked PRs land
base first, one squash each. Never force-push.

## Post-merge

1. `gh pr view <M> --repo cloud-pi-native/console --json state` → `MERGED`.
2. **Manual acceptance** — a merge is a claim, not a verified outcome:
   surface the deployed state and let the user validate. Never close the
   issue on merge alone.
3. Close the issue deliberately — tasklist N/N plus acceptance — then
   `gh issue close <N> -R cloud-pi-native/console -c "Réglée par <PR URL>"`.
4. Rebase stacked PRs onto the new `main`.
5. Cleanup: `git worktree remove ../console.<topic>` and
   `git branch -d <branch>` (`cpn-delegate` · After landing).

## Pitfalls

- Merge after a new push without re-approval — approval binds to a head
  commit.
- `Closes #N` in the squash body — auto-close fires before the ledger is
  verified; issues close deliberately.
- Watch and merge joined with `&&` — the merge fires on stale gates.
- `--admin` to skip gate 4 — forbidden.

## Verify

```bash
gh pr view <M> --repo cloud-pi-native/console --json state,mergeCommit
gh pr list --repo cloud-pi-native/console --state open
```

## See also

`cpn-pr` (opening, merge queue) · `cpn-review` (review, reconcile) ·
`cpn-delegate` (isolation, cleanup).
