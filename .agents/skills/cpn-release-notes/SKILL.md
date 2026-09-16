---
name: cpn-release-notes
description:
  "Use when writing the consumer release notes of this repo: per-tag
  attribution, French structure, verified counts."
version: 1.0.0
license: Apache-2.0
---

# Console release notes

Consumer-facing note in French, grounded in tags rather than the CHANGELOG
alone: release-please folds hotfix commits into the next minor's section, so
only per-tag ranges give true version attribution.

## Prerequisites

- `git fetch --tags` run; `git tag -l | sort -V` lists the range.
- The range ends at the newest *released* tag, never HEAD — compare
  `git log <latest-tag>..origin/main` for the unreleased tail.

An unmet requirement is a reported blocker, never a silent scope change.

## Attribution

- For each consecutive tag pair run
  `git log --no-merges --format='%h %s' vA..vB`; skip the
  `chore(...): Release vX` bot commits.
- Never quote a commit count from the CHANGELOG or a previous note without
  re-measuring it against git output.

## Structure (repo convention)

- File: `RELEASE_NOTES_<latest>.md` at repo root, written in French.
- Coverage line: `*Couvre <versions with dates>, version actuellement en
  production la plus récente.*`
- Sections in order: Points forts (4–6 prose bullets) → Nouveautés →
  Corrections de bugs (grouped by domain: Observabilité / Identité & accès /
  Secrets & pipelines / Registre / Déploiements & ArgoCD / Client / Backend
  NestJS; one version tag per line) → Sécurité (counts + mechanism, not
  package dumps) → footer.
- Footer states what was deliberately omitted (ci/chore/refactor entries)
  and lists commits merged to `main` after the last tag as unreleased.
- Re-check `apps/nginx-strangler/conf.d/routing.conf` before describing the
  backend migration: it is a bascule progressive, never a completed cutover.

## Verify

Every fix commit of the new patch versions appears in the note with its
version tag (`grep '<x.y.z>' RELEASE_NOTES_<latest>.md`), and no commit of
the next unreleased minor is quoted as shipped content.
