---
name: cpn-wiki
description:
  "Use when editing the repository wiki: Home stays the index, one owner per
  page, direct push without PR, clone the .wiki.git remote first."
license: Apache-2.0
metadata:
  version: 1.0.0
---

# Console wiki

The wiki is the repo's knowledge base. It lives in its own git remote —
`git@github.com:cloud-pi-native/console.wiki.git` — outside the main
checkout, with no branch protection and no PR review.

## Prerequisites

```bash
git clone git@github.com:cloud-pi-native/console.wiki.git ~/Source/Repos/github.com/cloud-pi-native/console.wiki
```

Wiki enabled on the repo and the clone writable. An unmet requirement is a
reported blocker, never a silent scope change.

## Rules

- **`Home.md` is the index.** Every add, move, rename, or delete of a page
  updates `Home.md` in the same commit.
- **One page, one owner.** Each page opens with an HTML comment naming the
  owner and purpose: `<!-- owner: <team|login> | purpose: ... -->`.
- **Direct push, no PR.** Wiki pushes bypass the main repo's protection;
  org-sensitive or secret-adjacent content never goes to the wiki — it stays
  in the repo under review.
- **Relative links only** between wiki pages.
- French for prose, English for identifiers and commands, matching the repo.

## Procedure

1. Clone or pull the wiki remote — never assume the local copy is current.
2. Edit or add the page; update `Home.md` in the same change.
3. Commit with the same conventional shape as the main repo, `docs: ...`.
4. Push to `master` directly.
5. Read back: `git ls-remote` head moved, page renders in the web view.

## Pitfalls

- Editing in the web UI then pushing a stale local clone — pull before
  every edit cycle; the UI and git writes share one history.
- An orphan page absent from `Home.md` is invisible to readers — the index
  update is not optional.
- The wiki remote is `master`, not `main`.

## Verify

`git ls-remote` head equals local HEAD after push; `Home.md` lists the page.

## See also

`cpn-commit` (message shape) · `cpn-dev` (lifecycle).
