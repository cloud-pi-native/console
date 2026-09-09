---
name: cpn-issue
description:
  "Use when opening, triaging, or closing an issue in this repo: French
  templates, acceptance ledger, additive triage."
version: 1.0.0
license: Apache-2.0
---

# Console issues

Issue-first repo norm: no PR without an issue behind it (lifecycle in the
`cpn-dev-workflow` skill, link-up in `cpn-pr`).

## Prerequisites

- Issues live on `cloud-pi-native/console`.
- `gh` authenticated with write access, verified:

```bash
gh api user --jq .login # authenticated
gh api repos/cloud-pi-native/console --jq .viewerPermission # write to triage
```

An unmet requirement is a reported blocker, never a silent scope change.

## Open

1. Search before creating — reuse a matching open issue instead of a
   duplicate: `gh issue list --repo cloud-pi-native/console --state open
   --search "<keywords>"`.
2. Title `🐛 [BUG] - <summary>` or `💡 [REQUEST] - <summary>`, via
   `.github/ISSUE_TEMPLATE/`; label `bug` / `enhancement`.
3. Body in **French**, from the template: problem statement (need, scope,
   impact) plus a `- [ ]` **Définition du fini** acceptance tasklist as the
   work ledger — never the solution; findings and analysis go in comments.
4. Free-text rules: natural paragraphs, no hard wrapping, never run a
   formatter over a body; a literal `@` in prose triggers a user/team mention
   — wrap it in a code span.

```bash
gh issue create --repo cloud-pi-native/console \
  --title "💡 [REQUEST] - <summary>" --label enhancement --body-file <file>
```

## Triage

Fill each empty, determinable field, additively (`--add-label` /
`--add-assignee`, never `--label`); never invent a value the repo doesn't
have — filter labels against `gh label list`:

```bash
gh issue edit <N> --repo cloud-pi-native/console \
  --add-label <label> --add-assignee "$(gh api user --jq .login)" \
  --milestone "<milestone>"
```

- **labels** — from `gh label list`, seeded by the title marker.
- **assignee** — the author, if empty.
- **milestone** — bug → highest open patch of the current minor line;
  enhancement → next minor/major.
- **project** — `--add-project <n>` only when one board is the obvious home;
  skip when ambiguous.

The issue clearly belongs to another `cloud-pi-native/*` repo? Transfer
instead of re-triaging: `gh issue transfer <N> <OWNER/REPO>` — do not edit or
close the source first.

## Iterate & close

- The body stays the stable problem statement; decisions go to the comment
  thread via `gh issue comment <N> --body-file <file>`, one line per decision;
  lasting references are appended to the body's Références section.
- Closure is deliberate: verify every `- [ ]` box against evidence, then
  `gh issue close <N> --comment "<evidence>"`. Never rely on PR-merge
  auto-close, never close silently — state why (duplicate → link the
  canonical issue).

## Verify

```bash
gh issue view <N> --repo cloud-pi-native/console \
  --json number,title,labels,state
```
