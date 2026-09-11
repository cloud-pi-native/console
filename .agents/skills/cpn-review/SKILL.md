---
name: cpn-review
description:
  "Use when reviewing a PR or reconciling its review threads in this repo:
  severity-tagged French inline findings, DoD ledger, never merge."
version: 1.0.0
license: Apache-2.0
---

# Console PR review & reconciliation

Review = read + verdict. Reconciliation = threads + DoD ledger + CI report.
Neither merges — merge follows human approval; see `cpn-land`.

## Prerequisites

```bash
gh api user --jq .login # authenticated
gh pr view <N> --repo cloud-pi-native/console # PR exists
```

- Review covers others' work — never review or approve your own PR.

An unmet requirement is a reported blocker, never a silent scope change.

## Review

1. **Context** — `gh pr view <N> --repo cloud-pi-native/console`: title, body,
   linked issue; confirm the branch is rebased on `main` and the diff matches
   the stated scope: `gh pr diff <N> --name-only`.
2. **High-level** — architecture fit: `apps/server-nestjs` is the only
   modifiable backend target, `apps/server` frozen; API contracts in
   `packages/shared`; hook lifecycle `pre → main → post` with `revert` on
   failure; permission checks at the router via BigInt bitmasks.
3. **Line-by-line** — YAGNI first: anything deletable or replaceable by the
   stdlib is a finding. A deliberate corner-cut carries a `ponytail:` comment
   naming the ceiling and the upgrade path.
4. **Verdict** — findings posted **inline, in French**, one comment per
   finding, severity-prefixed: 🔴 `blocking`, 🟠 `important`, 🟡 `nit`,
   ⚪ `suggestion`, ✨ `praise`. Review body = 2-3 sentence verdict.

```bash
gh pr review <N> --repo cloud-pi-native/console \
  --request-changes --body "…" # only on blocking/important findings
gh pr review <N> --repo cloud-pi-native/console --approve --body "…" # otherwise
```

Commitlint violations → suggest the corrected conventional message; the
author amends.

## Reconcile

1. **Ledger DoD** — criteria = the linked issue's `- [ ]` tasklist; verify
   each against the diff/CI. Tick a box only with evidence posted first; an
   unmet criterion is reported, never silently ticked. No linked issue →
   link one or state "sans ledger".
2. **Threads** — an unresolved inline thread is an unfinished review:
   pertinent → address it or add it to the issue ledger; irrelevant → reject
   with a stated rationale, then resolve. Resolution is the GraphQL mutation —
   a reply alone does not close the thread:

   ```bash
   gh api graphql -f query='mutation($id: ID!) {
     resolveReviewThread(input: {threadId: $id}) { thread { isResolved } }
   }' -f id=<threadId>
   ```

3. **Approval + CI** — a human approving review from another collaborator on
   the current head, re-reviewed after new commits; `gh pr checks <N>`. The
   SonarQube Quality Gate requires 0 new issues; when every check is green
   but `mergeStateStatus` is `BLOCKED`, enqueue:

   ```bash
   gh workflow run 243523481 --repo cloud-pi-native/console -f PR_NUMBER=<N>
   ```

4. **Report only** — verdict: ledger N/N · approval state ·
   threads resolved or pending with rationale · CI green/pending/failing.
   Never merge from here.
