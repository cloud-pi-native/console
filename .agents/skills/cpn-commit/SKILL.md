---
name: cpn-commit
description:
  "Use when committing in this repo: conventional commit shape enforced by
  commitlint."
version: 1.0.0
license: Apache-2.0
---

# Console commits

The `commit-msg` Husky hook runs commitlint (`commitlint.config.cjs`, extends
`@commitlint/config-conventional` with `'body-leading-blank': [2, 'always']`).
Release Please derives version bumps from the type.

## Prerequisites

- Feature branch off `origin/main`, `git branch --show-current` to confirm —
  never commit on `main`.
- Husky hooks active via `pnpm install`; commitlint rejects a malformed
  message at `commit-msg`.

An unmet requirement is a reported blocker, never a silent scope change.
Never bypass hooks with `--no-verify`.

## Commit shape

| Rule     | Value                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| Types    | `feat`, `fix`, `chore`, `docs`, `refactor`, `revert`, `build`, `feature`                  |
| Scope    | optional, `type(scope):`                                                                  |
| Breaking | `type!:` / `type(scope)!:`                                                                |
| Subject  | imperative, lowercase start, no trailing period                                           |
| Body     | optional, separated from the subject by exactly one blank line                            |
| Footer   | `Refs #N`; never `Closes #N` — issues close deliberately after verification               |

Reference safety: a bare `#N` resolves to a console issue/PR. Cross-repo
references use a full URL or `owner/repo#N`.

## Procedure

Single-line message:

```bash
git commit -m "fix: prevent null group lookup in keycloak sync"
```

With a body, use a heredoc; repeated `-m` flags are fragile under shell
quoting. The blank line after the subject satisfies `body-leading-blank`:

```bash
git commit -m "$(cat <<'EOF'
feat(plugins): add vault secret rotation

Supports monthly rotation via the hook post step.

Refs #123
EOF
)"
```

Fold work into the last commit with `git commit --amend` — never amend a
commit that is already pushed and under review.

## Verify

`git log -1 --format=%B` — shape matches the table; footer `Refs #N` present
when an issue stands behind the commit.
