---
name: cpn-pr
description:
  "Use when drafting or revising pull request titles and descriptions,
  opening, updating or triaging a PR, rebasing its branch, or resolving
  pull request conflicts in this repo."
license: Apache-2.0
metadata:
  version: 1.5.0
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

## Resolve conflicts on an existing PR

Follow the [shared Git policy](../../../docs/agents/git-and-release.md#resolving-pull-request-conflicts).
Keep this operation separate from landing (`cpn-merge`).

1. Inspect the PR target, remote head, requested reviewers and worktree status.
   Use the existing isolated worktree when clean; do not absorb unrelated work.
   Fetch the target and PR branch, record their SHAs and the previous local head.
   Diagnose the conflicting changes and obtain approval for rewriting and pushing
   shared history before proceeding. Do not rebase merely because a conflict-free
   PR is behind its target.
2. Run `git rebase origin/<target>` (normally `origin/main`). For each conflict,
   inspect the commit being replayed and the target's intent. Resolve in that
   commit, stage explicit paths, then `git rebase --continue`. Stop on ambiguity;
   do not blindly select a side. Do not merge the target or create a separate
   conflict-resolution commit. Preserve independent logical commits; do not
   squash the entire PR by default.
3. Check `git diff --check`, the final diff against the target and the differences
   from the previous head (including target changes). Run the quality gates for
   the changed surface. Confirm the intended commits remain and no merge commit
   was introduced.
4. Report the branch, remote, rewritten commits and validation. With publication
   approval, push only the PR ref, using the remote SHA recorded before rewriting:

   ```bash
   git push --force-with-lease=refs/heads/<branch>:<observed-remote-sha> origin HEAD:refs/heads/<branch>
   ```

   Never force-push `main`, and never use plain `--force`. If the lease fails,
   stop and inspect the new remote commits; do not refresh the lease and retry
   blindly.
5. Reread the PR head, conflict status, CI and `reviewRequests`. Request only
   `cloud-pi-native/socle` and verify it is the sole requested reviewer, without
   individual users. Wait for renewed human approval on the rewritten head
   before landing; do not merge as part of conflict resolution.

## Opening

- Branches live on the org repo itself; origin-only, no forks. `main` is
  protected; only `hotfix/*` may bypass the feature-branch rule, and the
  branch prefix matches the commit type: `feat/`, `fix/`, `docs/`, ...
- Open as **draft**, title = conventional commit subject, body =
  `.github/PULL_REQUEST_TEMPLATE.md` in French, with the issue URL under
  `Références`. Resolve the exact issue (repository and number) before opening.
  The textual reference does not replace the native link:

```bash
gh pr create --repo cloud-pi-native/console --draft --base main \
  --head <branch> \
  --title "<type>: <subject>" \
  --body-file <body> --reviewer cloud-pi-native/socle
```

Before reporting the creation as complete:

1. Reread `body`, `isDraft`, `reviewRequests` and the PR URL with `gh pr view`.
   Require the expected non-empty description; use a real file with `--body-file`.
   Require `isDraft: true` and exactly one review request: team
   `cloud-pi-native/socle`, no users. Before modifying any cloud-pi-native PR,
   inspect current review requests; after changing them, verify the same set.
   If the team cannot be requested, report the blocker; never substitute anyone.
2. Apply the creation procedure in `cpn-project` and verify Socle, `PI` and `Epic`.
3. Link the issue through GitHub's native **Déploiement** relation. Check
   `PullRequest.closingIssuesReferences` first; if the exact issue is absent,
   call GraphQL `addCloseIssueReferences` with the issue node ID (`issueId`)
   and PR node ID (`pullRequestIds`), then reread the relation and match
   repository and number. Keep the link for traceability; automatic closure at
   merge is disabled, and issue closure remains deliberate (`cpn-issue`).
4. Apply `cpn-triage` to set and reread `Assignee` and `Milestone`.
5. On any failure, report the existing PR URL, verified values and remaining
   action. If creation returned an error, check for a PR on the exact head
   before retrying: the PR may exist even if adding the reviewer failed.

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
- **assignee and milestone** — resolve and verify via `cpn-triage`.
- **reviewers** — follow the exclusive team rule and read-back under Opening;
  an existing request is not proof of compliance.

## After opening

- Keep it draft until the ready gate below. A human approval is required for
  landing — never self-merge.
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

- Adding a merge commit to resolve PR conflicts — rebase and absorb the resolution into the affected commits instead.
- Treating all force-pushes as forbidden — `main` is forbidden; an authorized PR-branch rewrite uses a pinned `--force-with-lease`.
- Squashing independent commits just because conflicts were resolved — preserve their logical boundaries.

Conflict-resolution scenarios: [evals/evals.json](evals/evals.json).

- French prose is not necessarily accessible: « spike » and « évaluateur intégré » still hide the objective from a reader unfamiliar with the code.
- A list of successful test commands can bury the change itself. Keep their exact results separately and retain the meaningful validation limits in the description.
- A documentation link is not proof that its terms were checked; read the relevant content and report unavailable or missing definitions honestly.
