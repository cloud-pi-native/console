---
name: cpn-release-patch
description:
  "Use when cutting a patch hotfix in this repo: the milestone's merged PRs
  are the backport set, duplicated onto the base tag with jj."
version: 1.0.0
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
- Tag exists: `git rev-parse -q --verify <tag>`; sync bookmarks and tags
  from the console remote before reading them.
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
```

2. **Rebuild the chain on the tag.** Point the working copy at the tag
   itself, then duplicate the set — no empty scaffold commit:

```bash
jj goto <tag>
jj duplicate $(tr '\n' ' ' < /tmp/backport-ids.txt) --onto @
TIP=$(jj log -r 'heads(@)' --no-graph -T commit_id | head -1)
```

3. **Verify before pushing.** Exact commit count (milestone size, no
   scaffold), zero conflict markers in `<tag>..$TIP`, and
   `git diff --name-only $TIP origin/main` limited to release-please files
   (`package.json`, `CHANGELOG.md`, `.release-please-manifest.json`) — any
   other file means a missed or mis-ordered commit. Subjects must match the
   milestone PR titles, with zero next-minor leaks.

4. **Push the branch release-please watches.** `hotfix/*` is the one prefix
   allowed on `main` without a feature branch (`cpn-pr`):

```bash
jj bookmark set hotfix/<x.y.z> -r "$TIP"
jj git push --remote cloud-pi-native --bookmark hotfix/<x.y.z>
```

Never cut the tag by hand — release-please opens `chore: Release v<x.y.z>`
from the branch (`always-bump-patch` on `hotfix/*`). Landing that release PR
follows `cpn-pr` and `cpn-merge`.

## Pitfalls

- `jj new <tag> -m` leaves an empty ancestor that blocks the push
  ("no description") — point the working copy at the tag, then duplicate.
- Stale remote-tracking bookmark blocks the push — fetch from the console
  remote, re-point with `jj bookmark set --allow-backwards`, push again.
- Fetching with the wrong remote — this repo's workspaces can carry a
  second `origin`; always pin `--remote cloud-pi-native` for jj git ops.

## Verify

`git ls-remote cloud-pi-native refs/heads/hotfix/<x.y.z>` equals `$TIP`, and
the release-please PR targets `hotfix/<x.y.z>`.

## See also

`cpn-release-notes` (consumer notes per tag) · `cpn-pr` (branch
conventions) · `cpn-merge` (landing the release PR) ·
`cpn-dev-workflow` (lifecycle).
