# Git and release workflow

Read when creating commits, branches, pull requests or releases.

- `main` is protected; hotfix branches use `hotfix/*`.
- Conventional commit types enforced here: `feat`, `fix`, `chore`, `docs`, `refactor`, `revert`, `build`.
- The only versioned Husky hook is `.husky/commit-msg`, which runs commitlint. No pre-commit or pre-push hook is versioned; run the required checks explicitly. For Markdown-only changes, follow the verification exception in [Testing and quality gates](testing.md).
- Pull request template: `.github/PULL_REQUEST_TEMPLATE.md`.
- Release Please automates versioning, changelogs, npm publication, Docker image publication and Helm chart updates.
