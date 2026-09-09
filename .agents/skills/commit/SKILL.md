---
name: commit
description:
  "Use when committing in this repo: conventional commit shape enforced by
  commitlint, authored through jj."
version: 1.0.0
license: Apache-2.0
---

# Console commits

The `commit-msg` Husky hook runs commitlint (`commitlint.config.cjs`, extends
`@commitlint/config-conventional` with `'body-leading-blank': [2, 'always']`).
Release Please derives version bumps from the type.

## Commit shape

| Rule     | Value                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| Types    | `feat`, `fix`, `chore`, `docs`, `refactor`, `revert`, `build` (`feature` also recognized) |
| Scope    | optional, `type(scope):`                                                                  |
| Breaking | `type!:` / `type(scope)!:` (MAJOR bump)                                                   |
| Subject  | imperative, lowercase start, no trailing period                                           |
| Body     | optional, separated from the subject by exactly one blank line                            |
| Footer   | `Refs #N`; never `Closes #N` — issues close deliberately after verification               |

Reference safety: a bare `#N` resolves to a console issue/PR. Cross-repo
references use a full URL or `owner/repo#N`.

## Procedure (jj — never `git commit`)

```bash
jj describe -m "fix: prevent null group lookup in keycloak sync"
```

With a body — each `-m` block is a paragraph, so the blank line between blocks
satisfies `body-leading-blank`:

```bash
jj describe \
  -m "feat(plugins): add vault secret rotation" \
  -m "Supports monthly rotation via the hook post step." \
  -m "Refs #123"
```

To fold work into the current commit instead of stacking a new one:
`jj squash` from the working copy, or keep amending `@` with `jj describe`.

Confirm: `jj log -r @ --no-graph -T description`.
