---
name: cpn-release-notes
description: Use when preparing, updating, or reviewing a human-readable dso-console release note for an RC or stable release.
license: Apache-2.0
metadata:
  version: '2.1.0'
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

## Explain changes and verify documentation

Write for a newcomer who has only the product documentation and this note,
not the tickets or commits. Group changes by usage or audience (project teams,
socle administration, operations). For each entry, explain the situation,
the concrete change and its effect; retain the ticket link as evidence, not
as a substitute for the explanation. Do not turn an implementation detail or
a ticket's intended outcome into an unproven user benefit.

Use **socle**, not *plateforme*, in editorial prose; preserve exact interface
labels and role names such as « Sécurité Plateforme ». Explain reprovisioning
as bringing resources into conformity with their **configuration déclarative**,
which describes their expected state. Distinguish consultation permissions
from a preconfigured role whose definition cannot be edited; do not infer
that its members cannot be managed or freeze future role behavior.

For every public change entry, include a direct, relevant documentation link
on `https://cloud-pi-native.fr/` (section anchor when useful), plus its ticket
or PR link. Read the page and compare its content with the delivered behavior:
a successful HTTP response alone is not proof of adequate documentation.
Apply this to the source, GitHub description and summarized Mattermost entries.
Read [the Mattermost contract](references/mattermost.md) for that rendering.

Expose every missing, incomplete or obsolete explanation in the audit, with
the affected change, page or search scope, missing information and expected
correction. Distinguish an inaccessible/unverified source from confirmed
missing documentation: label it « Documentation non vérifiée », not a proven
content gap. Never invent a link, substitute the homepage, or
silently exempt a change. Present these gaps explicitly before content
approval and ask for a correction decision; keep them open until corrected
content has been checked. Reporting a gap does not resolve it. Do not claim
complete documentation while a gap is open. Do not create documentation
issues or edit another repository without a separate authorized scope.

## Make required actions impossible to miss

Check upgrade consequences against delivered changes and documentation.
When intervention is required, put **⚠️ Actions requises pour la mise à jour**
before objectives and changes in every public rendering, including Mattermost.
For each action, state who is affected and under what conditions, exact steps,
when to act (before/after upgrade or before a named operation), the consequence
of inaction, and a direct link to the verified procedure. A short announcement
must retain all these instructions; never bury them in a ticket or link alone.

If no user intervention is required, omit the action section entirely and do
not add an « aucune action nécessaire » reassurance sentence. If consequences
or steps are uncertain, flag them as **Actions à clarifier** at the top of the
preview and in the audit, ask for the missing facts, and do not present the
note as ready for validation. Never invent a procedure or infer no action
from missing evidence.

## Preview, preserve, then write

Read `CHANGELOGS/<stable>.md` when it exists. Quote its editorial prose in a
`Corrections éditoriales préservées` preview and keep it verbatim at its
existing location; it must not appear as a removed diff line. Present the
source and audit diffs, the Mattermost rendering and its proposed temporary
file `/tmp/dso-console-<stable>.mattermost.md`, plus the proposed GitHub Release
description. Ask confirmation of the Helm version, exceptional inclusions,
documentation correction decisions and all proposed content before writing.
This is a hard gate: urgency or a request to skip questions never authorizes
writes or external changes without that
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

## Pitfalls

- A role with a non-editable definition does not imply read-only permissions;
  name both properties separately when the evidence supports them.
- A reachable page is not necessarily current documentation; a timeout is not
  proof that a page is missing. Neither a generic link nor an audit entry fixes
  a gap: verify the corrected explanation before closing it.
- Migration instructions buried in changes or omitted from Mattermost are
  ineffective warnings. Keep actionable instructions at the top of each format.
- Empty action sections and « aucune action nécessaire » sentences add noise;
  unknown upgrade consequences require clarification, not reassurance.
