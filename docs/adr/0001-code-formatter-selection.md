# ADR 0001: Code Formatter Selection

## Status

Accepted

## Context

Currently, code formatting in the console repository is handled by ESLint via `@antfu/eslint-config`, which bundles both linting and formatting rules. This approach presents several problems:

1. **Fragile configuration**: The setup mixes `eslint`, `eslint-formatter`, and `@antfu/eslint-config` — three separate dependencies for a single concern (formatting).
2. **Incomplete coverage**: The formatter has not been applied to all files (strategy: "not modified = not formatted"), causing large formatting changes to appear sporadically in commits.
3. **Conflated concerns**: Linting (code quality, bugs) and formatting (style, consistency) are coupled, making it harder to evolve each independently.
4. **Performance**: ESLint's formatting is slower than dedicated formatters.

## Decision

**Adopt Oxfmt** — a Rust-powered, Prettier-compatible code formatter from the Oxc project.

### Why Oxfmt

- **Extremely fast**: >30× faster than Prettier, >3× faster than Biome (Rust-powered, no cache needed)
- **Prettier-compatible**: Same config format, same output, ~95% conformance with Prettier's test suite
- **Single tool**: Standalone CLI, handles JS/TS/JSON
- **Simple config**: `.oxfmtrc.jsonc` with Prettier-compatible options
- **Active development**: Beta reached Feb 2026, import sorting planned

### What Changed

1. **Added `oxfmt`** as root devDependency
2. **Created `.oxfmtrc.jsonc`** — Prettier-compatible config (printWidth: 100, singleQuote, trailingComma)
3. **Disabled formatting rules** in `packages/eslintconfig/src/index.js` — ESLint now handles only linting
4. **Updated `format` scripts**: `oxfmt --write && eslint . --fix`
5. **Updated `format:check` scripts**: `oxfmt --check && eslint .`
6. **Excluded `apps/server-nestjs/`** from oxfmt (pre-existing decorator syntax errors in WIP rewrite)

### Consequences

**Positive:**

- Formatting is extremely fast (Rust-powered)
- All files consistently formatted — no more surprise formatting diffs in PRs
- ESLint config simpler, focused on actual code quality
- Single config file for formatting

**Negative:**

- Newer tool (beta), smaller ecosystem than Prettier
- Vue formatting via embedded language support (planned)
- One-time large commit reformatting all files (done in dedicated PR)

---

_Decision made: 2026-06-16_
_Author: Operator 11O_
_Based on issue #1628_
