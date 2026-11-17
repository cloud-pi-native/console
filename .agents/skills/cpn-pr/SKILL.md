---
name: cpn-pr
description:
  "Use when drafting or revising pull request titles and descriptions,
  opening or triaging a PR in this repo."
license: Apache-2.0
metadata:
  version: 1.4.0
---

# Console pull requests

## Write for everyone interested in the project

Apply these rules when drafting or revising a **title and description**, not only when opening a PR. A drafting request does not authorize publication or metadata changes.

- Write in French for anyone connected to or interested in the project, including non-developers. Explain why the change matters, what it concretely changes and its important limits. A PR description is a step back from the code, not a technical report.
- **Before writing, systematically consult the relevant pages of https://cloud-pi-native.fr/** to choose the project's precise terms. Use the available browsing tools or identifiable official excerpts supplied for the task. Record the pages consulted separately from the copy-ready text; include them in Références only when they help understand the change, not just to prove a vocabulary lookup.
- Preserve documented project terms and exact interface labels. Documentation guides vocabulary, but an old description does not prove what this PR delivers: check the diff and delivery evidence separately. If a term is absent from the consulted pages, ambiguous or contradicted by current evidence, state the gap and scope of the lookup separately; use a plain description without inventing an official name. If the documentation cannot be reached, report it and mark the wording as provisional rather than claiming it is verified.
- Make the title name the concrete change, not its internal mechanism; keep the conventional commit prefix. For example: « feat: préparer la gestion des fonctionnalités expérimentales dans la console », not « feat: amorcer le spike Experimental Features ».
- Under Pourquoi and Quoi, retain only the objective, the useful scope and limits that affect understanding. Leave component inventories, internal names and implementation explanations with the code and its colocated documentation. For an unfinished integration, describe what is not yet possible instead of listing the tools still to connect: « les demandes ne sont pas encore appliquées aux services », not « branchement flagd/OpenFeature à réaliser ». Explain an indispensable technical term briefly. Never simplify away a partial delivery, security limitation, missing validation or required action.
- Under Vérification, summarize the checks and their results in ordinary language, distinguishing supplied results from checks actually run. State important checks not run. Do not include a command log, test counts or an inventory of suites, and do not merely paraphrase each command into another technical checklist. Prefer a useful summary such as « les tests automatisés et les contrôles du code ont réussi », when supported by the evidence. Preserve useful exact evidence in a **separate proposed comment**, or link existing technical evidence; when revising an existing body, do not silently discard it or publish a new comment without authorization. Never invent a successful check.
- Reread the title and body together: can someone unfamiliar with the code explain why this work exists, what it changes and what remains unproven? Remove repetitions and details that do not answer that question, without imposing an arbitrary word count.

## Prerequisites

```bash
gh api user --jq .login # authenticated
gh api repos/cloud-pi-native/console --jq .viewerPermission # write, origin-only
git fetch origin && git rebase origin/main # current, no conflicts
```

- An issue stands behind the change — issue-first norm, no orphan PRs.
- Quality gates green — see the `cpn-dev` skill; the `pre-push`
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
- Reference issues as `#N` when the reference stands alone — it renders as
  a rich link. Cross-repo references carry `owner/repo#N` or a full URL.

## Triage after creation

Set each empty, determinable field, additively (`--add-label` /
`--add-assignee`, never `--label`):

- **labels** — from `gh label list`, never from memory. Conventional type →
  matching label; doc changes → `docs` (this repo's real label;
  `documentation` does not exist).
- **assignee** — if empty and the work is machine-routable (no human
  credentials, hardware, or spending): the author; otherwise leave empty
  with a recorded reason.
- **milestone** — bug → highest open patch of the current minor line;
  feature → next minor/major.
- **reviewers** — one collaborator if none requested; otherwise skip.

## After opening

- Keep it draft until review passes; a human approving review from another
  collaborator is required — never self-merge.
- **Flip to ready only at the gate:** CI green on the pushed head, body
  reconciled with the diff, then `gh pr ready <N> --repo cloud-pi-native/console`.
  Verify with `gh pr view <N> --json isDraft` → `false`.
- CI includes the SonarQube Quality Gate. When all checks are green but
  `mergeStateStatus` is `BLOCKED`, enqueue:

```bash
gh workflow run 243523481 --repo cloud-pi-native/console -f PR_NUMBER=<N>
```

Landing once gates pass (ledger, threads, CI, human approval): `cpn-merge`.

## Pitfalls

- French prose is not necessarily accessible: « spike » and « évaluateur intégré » still hide the objective from a reader unfamiliar with the code.
- A list of successful test commands can bury the change itself. Keep their exact results separately and retain the meaningful validation limits in the description.
- A documentation link is not proof that its terms were checked; read the relevant content and report unavailable or missing definitions honestly.
