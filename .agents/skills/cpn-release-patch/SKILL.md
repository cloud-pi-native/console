---
name: cpn-release-patch
description:
  "Use when cutting a patch hotfix in this repo: the milestone's merged PRs
  are the backport set, duplicated onto the base tag with plain git."
version: 1.1.0
license: Apache-2.0
---

# Console hotfix backport

Cut `hotfix/<x.y.z>` from the previous patch tag so release-please opens the
patch release PR. The backport set is the **target milestone's own merged
PRs**, never a `BASE_TAG..main` diff — `main` carries the next minor's dev
commits whose patch-ids are absent from the tag (measured on 9.24.5: 16
in-milestone commits vs 35 from the diff).

## Prerequisites

- Write access:
  `gh api repos/cloud-pi-native/console --jq .viewerPermission`.
- Tag exists: `git rev-parse -q --verify <tag>`; fetch tags and branches from
  the console remote before reading them
  (`git fetch origin --tags --prune`).
- The next patch milestone exists and is open:
  `gh api 'repos/cloud-pi-native/console/milestones?state=open'`.

An unmet requirement is a reported blocker, never a silent scope change.

## Procedure

1. **Backport set.** Fetch the milestone's merged PR numbers through the
   issues API, then each real SHA through the pulls endpoint — the issues
   API returns `pull_request.merge_commit_sha: null`:

```bash
gh api "repos/cloud-pi-native/console/issues?milestone=<num>&state=closed" \
  --jq '.[] | select(.pull_request != null) | .number'
gh api repos/cloud-pi-native/console/pulls/<n> --jq .merge_commit_sha
# drop nulls / duplicates, keep the result in /tmp/backport-ids.txt
# (one SHA per line)
```

2. **Rebuild the chain on the tag.** Detach HEAD at the tag itself, then
   replay the set with cherry-pick — no empty scaffold commit:

```bash
git checkout --detach <tag>
git cherry-pick --empty=keep $(tr '\n' ' ' < /tmp/backport-ids.txt)
TIP=$(git rev-parse HEAD)
```

   On a conflict, resolve it, `git add <file>`, `git cherry-pick --continue`;
   to drop a broken commit, `git cherry-pick --skip`.

3. **Verify before pushing.** Exact commit count (milestone size, no
   scaffold), zero conflict markers in `<tag>..$TIP`, and
   `git diff --name-only $TIP origin/main` limited to release-please
   files (`package.json`, `CHANGELOG.md`, `.release-please-manifest.json`,
   `.github/release-please-manifest.json`) — any other file means a missed or
   mis-ordered commit. Subjects must match the milestone PR titles, with zero
   next-minor leaks.

4. **Push the branch release-please watches.** `hotfix/*` is the one prefix
   allowed on `main` without a feature branch (`cpn-pr`):

```bash
git push origin HEAD:refs/heads/hotfix/<x.y.z>
```

Never cut the tag by hand — release-please opens `chore: Release v<x.y.z>`
from the branch (`always-bump-patch` on `hotfix/*`). Landing that release PR
follows `cpn-pr` and `cpn-merge`.

## Pitfalls

- `git checkout -b <branch> <tag>` leaves the branch anchored at the tag
  instead of the replayed chain — detach at the tag, cherry-pick, then push
  `HEAD:refs/heads/<branch>`; never commit onto the tag checkout itself.
- A stale remote `hotfix/*` branch rejects the push (non-fast-forward). Fetch
  the branch, then re-push with a lease:
  `git fetch origin 'refs/heads/hotfix/*:refs/remotes/origin/hotfix/*'`
  then
  `git push
  --force-with-lease=refs/heads/hotfix/<x.y.z>
    :refs/remotes/origin/hotfix/<x.y.z>
  cloud-pi-native HEAD:refs/heads/hotfix/<x.y.z>`.
- This repo's clones can carry a second `origin`; always name the remote
  `cloud-pi-native` explicitly for fetch and push.
- Cherry-pick conflicts are expected when a milestone PR touched files that
  also changed between tags — resolve in favor of the milestone PR's intent,
  then re-run the step 3 gates before pushing.

## Verify

`git ls-remote origin refs/heads/hotfix/<x.y.z>` equals `$TIP`, and
the release-please PR targets `hotfix/<x.y.z>`.

## See also

`cpn-pr` (branch
conventions) · `cpn-merge` (landing the release PR) ·
`cpn-dev-workflow` (lifecycle).
