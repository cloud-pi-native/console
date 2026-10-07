---
name: cpn-release-notes
description: Use when preparing, updating, or reviewing a human-readable dso-console release note for an RC or stable release.
version: 2.0.0
license: Apache-2.0
---

# Console release notes

Produce a French, user-facing note from verifiable evidence. The milestone
states the intended scope; the candidate-tag Git range proves delivery.

Safety invariants: write nothing until the user approves the complete preview.
A candidate tag containing `-rc` always has `status: draft`; only a stable tag
may use `status: published`. Never publish the Release or Mattermost message.
The Mattermost file is only a copy-paste artifact and never changes release
status. If any required approval is missing, do not generate files or propose
publication commands; ask for the missing decision and stop. In particular,
never set `published` for an `-rc` tag, even under deadline pressure. If the
exact candidate-tag Release is missing, do not substitute or edit another
Release; report the blocker and stop that mutation. For each unmilestoned
functional change, ask a direct yes/no inclusion question and wait for its
answer before adding it to the note or Mattermost file.

## Collect and verify

Ask one question at a time, in this order: stable target (`X.Y.Z`), candidate
tag (`vX.Y.Z-rc*` or `vX.Y.Z`), then confirmation of the exact milestone titled
`X.Y.Z`. Run `git fetch --tags origin`; the preceding stable tag starts the
range. A missing tag or milestone is a blocker: do not guess. Locate the existing
GitHub Release for the candidate tag; a missing or mismatched release blocks
updating its description.

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
separate audit. Ask for an explicit decision before including any unmilestoned
functional change; do not include it in a preview as though that decision had
already been made.

## Preview, preserve, then write

Read `CHANGELOGS/<stable>.md` when it exists. Quote its editorial prose in a
`Corrections éditoriales préservées` preview and keep it verbatim at its
existing location; it must not appear as a removed diff line. Present the
source and audit diffs, the Mattermost rendering and its proposed temporary
file `/tmp/dso-console-<stable>.mattermost.md`, plus the proposed GitHub Release
description. Ask confirmation of the Helm version, exceptional inclusions and
all proposed content before writing. This is a hard gate: urgency or a request
to skip questions never authorizes writes or external changes without that
confirmation. Until confirmed, provide previews only.

After explicit validation, update `CHANGELOGS/<stable>.md` and
`CHANGELOGS/<stable>.anomalies.md`; write the Mattermost rendering to
`/tmp/dso-console-<stable>.mattermost.md`, outside the repository, and report
that exact path for copy-paste. Never store the Mattermost rendering under
`CHANGELOGS/` or another repository path. Use `draft` for an RC and
`published` for the stable tag. Never publish the Release or post the
Mattermost message; provide the file for manual copy-paste only. Update the
description of the existing GitHub Release for the candidate tag with the
approved source content, excluding its YAML frontmatter. Verify the release URL and tag first;
change only its description, preserving its draft/prerelease state. Do not
publish the release, send a webhook, modify other GitHub content, or overwrite
editorial text without explicit approval.
