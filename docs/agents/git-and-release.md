# Git and release workflow

Read when creating commits, branches, pull requests or releases.

- `main` is protected; hotfix branches use `hotfix/*`.

## Resolving pull request conflicts

- Rebase the PR branch onto its freshly fetched target (`origin/main` by default); do not merge the target into the PR branch or add a conflict-resolution merge commit.
- Resolve each conflict in the commit being replayed, preserving the intent of both sides. Keep logically separate commits separate: resolving conflicts does not require squashing the whole PR.
- Start from a clean worktree, inspect the affected changes, and obtain approval before rewriting or publishing shared history. If intent is unclear, stop rather than choosing `ours` or `theirs` blindly.
- Validate the resolved behavior and final diff before publishing. After a rebase, compare against the previous head while accounting for changes from the target branch.
- Never force-push `main`. For a rebased PR branch only, publish with `--force-with-lease` pinned to the inspected remote head; never use plain `--force`. A rejected lease requires a new diagnosis, not an unconditional retry.
- Recheck the published head, conflict status and CI; a rewritten head requires renewed human approval before landing. The agent procedure is in [cpn-pr](../../.agents/skills/cpn-pr/SKILL.md).

- Conventional commit types enforced here: `feat`, `fix`, `chore`, `docs`, `refactor`, `revert`, `build`.
- The only versioned Husky hook is `.husky/commit-msg`, which runs commitlint. No pre-commit or pre-push hook is versioned; run the required checks explicitly. For Markdown-only changes, follow the verification exception in [Testing and quality gates](testing.md).
- Pull request template: `.github/PULL_REQUEST_TEMPLATE.md`.
- Release Please automates versioning, changelogs, npm publication, Docker image publication and Helm chart updates.
