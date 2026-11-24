---
name: cpn-issue
description:
  "Use when drafting or revising issue titles and descriptions, opening,
  triaging, or closing an issue in this repo."
license: Apache-2.0
metadata:
  version: 1.3.0
---

# Console issues

Issue-first repo norm: no PR without an issue behind it (lifecycle in the
`cpn-dev` skill, link-up in `cpn-pr`).

## Prerequisites

- Issues live on `cloud-pi-native/console`.
- `gh` authenticated with write access, verified:

```bash
gh api user --jq .login # authenticated
gh api repos/cloud-pi-native/console --jq .viewerPermission # write to triage
```

An unmet requirement is a reported blocker, never a silent scope change.

## Write for everyone interested in the project

Apply these rules when drafting or revising a **title and description**, not only when opening an issue. A drafting request does not authorize publication or metadata changes.

- Write in French for anyone connected to or interested in the project, including non-developers. Explain the need, who is affected, its impact and the expected outcome. Take a step back from the implementation notes; do not merely translate their jargon.
- **Before writing, systematically consult the relevant pages of https://cloud-pi-native.fr/** to choose the project's precise terms. Use the available browsing tools or identifiable official excerpts supplied for the task. Record the pages consulted separately from the copy-ready text; add a page to Références only when it helps understand the need, not just to prove a vocabulary lookup.
- Preserve documented project terms and exact interface labels. Documentation guides vocabulary, but an old description does not prove current behavior. Check the reported facts separately. If a term is absent from the consulted pages, ambiguous or contradicted by current evidence, state the gap and scope of the lookup separately; use a plain description without inventing an official name. If the documentation cannot be reached, report it and mark the wording as provisional rather than claiming it is verified.
- Make the title name the problem or expected outcome, not a component or proposed implementation. Keep the repository's title markers. For example: « 🐛 [BUG] - Préserver la configuration des déploiements lors du reprovisionnement », not « Corriger le fallback du mapper ».
- Keep the description focused on the need and observable acceptance criteria. Leave hypotheses, component names and implementation proposals in analysis comments; detailed technical explanations belong with the code and its documentation. Do not copy an undefined internal name into the context just because it appeared in the notes. Explain an indispensable technical term briefly, without replacing precise project vocabulary with vague wording.
- Reread the title and body together: can someone unfamiliar with the code explain why this work matters and what result is expected? Remove repetitions and details that do not help answer that question. Do not impose an arbitrary word count or fill missing facts with invented detail.

## Open

1. Search before creating — reuse a matching open issue instead of a
   duplicate: `gh issue list --repo cloud-pi-native/console --state open
   --search "<keywords>"`.
2. Title `🐛 [BUG] - <summary>` or `💡 [REQUEST] - <summary>`, via
   `.github/ISSUE_TEMPLATE/`; label `bug` / `enhancement`.
3. Body in **French**, from the template: problem statement (need, scope,
   impact) plus a `- [ ]` **Définition du fini** acceptance tasklist as the
   work ledger — never the solution; findings and analysis go in comments.
4. Free-text rules: terse — one statement per fact, no rephrasing (full
   discipline in `cpn-dev`); natural paragraphs, no hard wrapping,
   never run a formatter over a body; a literal `@` in prose triggers a
   user/team mention — wrap it in a code span.

```bash
gh issue create --repo cloud-pi-native/console \
  --title "💡 [REQUEST] - <summary>" --label enhancement --body-file <file>
```

After opening, run the creation procedure in `cpn-project`: add the issue to
Socle and verify its `PI` and `Epic`. Apply `cpn-triage` immediately to set
and reread `Assignee` and `Milestone`. Report missing values with the issue URL.

## Triage

Fill each empty, determinable field, additively (`--add-label` /
`--add-assignee`, never `--label`); never invent a value the repo doesn't
have — filter labels against `gh label list`:

```bash
gh issue edit <N> --repo cloud-pi-native/console \
  --add-label <label> --add-assignee "$ASSIGNEE" \
  --milestone "<milestone>"
```

- **labels** — from `gh label list`, seeded by the title marker.
- **assignee and milestone** — resolve and verify via `cpn-triage`.
- **Socle, PI and Epic** — mandatory; delegate discovery and verification to
  `cpn-project`.

The issue clearly belongs to another `cloud-pi-native/*` repo? Transfer
instead of re-triaging: `gh issue transfer <N> <OWNER/REPO>` — do not edit or
close the source first.

An already-triaged issue re-enters triage when its evidence moved: body
edited after triage, comments stating facts the metadata predates, a linked
PR's diff outgrowing its labels. Re-derive from current evidence, change
only the fields whose derivation changed. Every changed field posts a trail
comment on the issue — field, old → new, the evidence that forced it. A
silent metadata edit is the defect this rule prevents.

## Milestones

- Addressed by **title**. `--milestone 12` fails: the number is not an
  identifier.
- Closing a milestone leaves its items open with the milestone greyed —
  sweep the remaining items before closing it.
- Creating one needs `due_on` as a full ISO timestamp with timezone
  (`2030-01-01T00:00:00Z`); a bare date is rejected. A due date comes from
  the release calendar only — never invent one.

## Iterate & close

- The body stays the stable problem statement; decisions go to the comment
  thread via `gh issue comment <N> --body-file <file>`, one line per decision;
  lasting references are appended to the body's Références section.
- Closure is deliberate: verify every `- [ ]` box against evidence, then
  `gh issue close <N> --comment "<evidence>"`. Never rely on PR-merge
  auto-close, never close silently — state why (duplicate → link the
  canonical issue).

## Pitfalls

- French prose is not necessarily accessible: « spike », internal component names or unexplained acronyms can still obscure the need.
- A well-structured issue can still be an implementation plan. Keep its acceptance criteria about the expected result, not the proposed code changes.
- A documentation link is not proof that its terms were checked; read the relevant content and report unavailable or missing definitions honestly.

## Verify

Verify Socle membership, `PI` and `Epic` via `cpn-project`, in addition to:

```bash
gh issue view <N> --repo cloud-pi-native/console \
  --json number,title,labels,state
```
