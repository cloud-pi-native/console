# Git and release workflow

Read when creating commits, branches, pull requests or releases.

- `main` is protected; hotfix branches use `hotfix/*`.
- Conventional commit types enforced here: `feat`, `fix`, `chore`, `docs`, `refactor`, `revert`, `build`.
- Husky hooks: pre-commit runs lint-staged, commit-msg runs commitlint, pre-push runs unit tests. For Markdown-only changes, apply the user-approved verification exception in [Testing and quality gates](testing.md).
- Pull request template: `.github/PULL_REQUEST_TEMPLATE.md`.
- Release Please automates versioning, changelogs, npm publication, Docker image publication and Helm chart updates.
