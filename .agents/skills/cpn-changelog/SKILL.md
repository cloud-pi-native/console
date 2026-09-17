---
name: cpn-changelog
description:
  "Use when adding a feature: carry a customer-facing highlight in the PR
  body so the release PR can surface it in the changelog."
version: 1.0.0
license: Apache-2.0
---

# Console changelog highlights

release-please builds `CHANGELOG.md` from commit subjects only — prose and
customer impact never survive. Highlights are carried in the **feature PR
body** under a `### Highlights` heading, then copied into the release PR's
`CHANGELOG.md` section (under `## <version>`, above the generated lists).

## Procedure

1. **Feature PR**: add to the body — one line per user-visible change,
   customer language, no commit jargon:

```markdown
### Highlights
- Les clés GitLab tournent automatiquement chaque mois
```

   Skip the section entirely for fixes/chores with no user-facing effect.

2. **Release PR** (author): grep the milestone's merged PR bodies and copy
   every `### Highlights` block into `CHANGELOG.md` before merging:

```bash
gh pr list --state merged --milestone <title> --json body --jq \
  '.[].body | select(contains("### Highlights"))'
```

3. **After merge** (optional): mirror to the GitHub Release body —
   `gh release edit v<x.y.z>`; release-please does not carry manual edits
   back to CHANGELOG.

## Pitfalls

- Editing `CHANGELOG.md` mid-cycle under an `Unreleased` heading is clobbered
  — release-please regenerates that section from commits; the PR body is the
  only durable carrier.

## See also

`cpn-release-patch` (hotfix backports) · `cpn-dev-workflow` (PR lifecycle).
