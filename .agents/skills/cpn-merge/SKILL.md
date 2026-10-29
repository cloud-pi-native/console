---
name: cpn-merge
description:
  "Use when merging a reviewed PR in this repo: DoD ledger, threads, CI, and
  human approval gates, then land through the merge queue (rebase)."
license: Apache-2.0
metadata:
  version: 1.2.0
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

**4 — Human approval on the current head.** A push after approval dismisses
it (`dismiss_stale_reviews_on_push`), and an approval bound to an older head
does not count; re-request review after any push:

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

The `main` ruleset enforces the merge queue and squash is disabled
repo-wide — **rebase is the only merge method**, and `gh pr merge --squash`
(including `--admin`) is rejected. **Watch and merge are two separate
steps** — never one chained command; a merge that fires unattended lands on
stale gates.

Step 1 — watch, observe only:

```bash
gh run watch --exit-status --repo cloud-pi-native/console \
  $(gh run list --repo cloud-pi-native/console --branch <branch> --limit 1 \
    --json databaseId -q '.[0].databaseId')
```

Step 2 — re-verify the gates on the current head, then enter the queue:

```bash
gh pr merge <M> --repo cloud-pi-native/console --auto --rebase
```

The queue validates the enqueued head itself; the "merge method set by
queue" warning is expected — it registers a REBASE
merge that lands when the queue batch is green. `--admin` does not bypass
the queue: it is the only lane, not a fast lane. Every check green but the
merge refused (`mergeStateStatus` `BLOCKED`) → enqueue the SonarQube gate
first (`cpn-pr` · After opening). Stacked PRs land base first, each riding
the queue separately. Never force-push; never push the queue's merge commit
— on ejection, restack onto the updated `main`, push, re-arm `--auto
--rebase`.

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
- `gh pr merge -m "text"` to set a message — `-m` is the `--merge` boolean;
  the message flags are `-t <subject>` / `-b <body>`.
- `--squash` (even with `--admin`) — the queue rejects it; rebase only.
- `Closes #N` in the merge body — auto-close fires before the ledger is
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
