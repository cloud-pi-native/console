---
name: cpn-release-notes
description: Use when preparing, updating, or reviewing a human-readable dso-console release note for an RC or stable release.
version: 2.0.0
license: Apache-2.0
---

# Console release notes

Produce a French, user-facing note from verifiable evidence. The milestone
states the intended scope; the candidate-tag Git range proves delivery.

## Collect and verify

Ask one question at a time, in this order: stable target (`X.Y.Z`), candidate
tag (`vX.Y.Z-rc*` or `vX.Y.Z`), then confirmation of the exact milestone titled
`X.Y.Z`. Run `git fetch --tags origin`; the preceding stable tag starts the
range. A missing tag or milestone is a blocker: do not guess.

Locate the generated `dso-console` Helm MR for the candidate tag. If multiple
MRs match, ask for its URL. Read its chart diff: `appVersion` must equal the
candidate tag and share the target base version. Propose its chart `version`
and require explicit confirmation. An RC uses its own Helm MR; replace these
values only after the stable Helm MR exists.

## Reconcile before drafting

Read [the output contract](references/output-format.md). Compare functional
commits and merged MRs in the candidate range with milestone tickets. Classify
all evidence as delivered and attributed; planned but not delivered;
unmilestoned or wrong-milestoned delivery; late milestone attachment from
before the preceding stable tag; or technical exclusion.

Only delivered, attributed items enter the source automatically. Never claim
planned or late-attached work as delivered. List all other categories in the
separate audit and ask whether an unmilestoned functional change belongs in the
note.

## Preview, preserve, then write

Read `CHANGELOGS/<stable>.md` when it exists. Quote its editorial prose in a
`Corrections éditoriales préservées` preview and keep it verbatim at its
existing location; it must not appear as a removed diff line. Present source
and audit diffs plus the Mattermost rendering. Ask confirmation of the Helm
version, exceptional inclusions and both diffs. Only then update
`CHANGELOGS/<stable>.md` and
`CHANGELOGS/<stable>.anomalies.md`. Use `draft` for an RC and `published` for
the stable tag. Do not publish, send a webhook, modify GitHub, or overwrite
editorial text without explicit approval.
