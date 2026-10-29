---
name: cpn-recette
description:
  "Use when running or planning a recette (validation) campaign for a CPiN
  release candidate: define sondes, execute them with evidence, record the
  compte-rendu — on any platform, console or socle."
license: Apache-2.0
metadata:
  version: 1.1.0
---

# Recette

Validate a release candidate against its target platform before the recette
session. The unit of work is the **sonde**: one corrective issue, one
expected behavior, one piece of evidence. The output is a compte-rendu with
a GO/NO-GO verdict, not impressions.

## Campaign lifecycle

1. **Plan.** Source the sondes from the release milestone's validation queue
   (the board view `Ready for test HP`) plus any fix shipped in the
   candidate that the queue hides. One campaign issue carries the sondes as
   a `- [ ]` ledger — that ledger is the board the loop reads.
2. **Verify the target.** Never probe an unverified build: version endpoint
   and tag-compare first (the deployed sha must contain every fix under
   test).
3. **Prepare fixtures and identities.** Identities and fixtures are
   provisioned declaratively when possible (socle values, Argocd-synced) —
   hand-created users are a fallback, never the convention. A campaign that
   needs shared-infrastructure manipulation states the need and waits for
   the operator's window.
4. **Execute.** Order non-destructive sondes first; destructive ones wait
   for the operator's review of pass-1 results. One sonde = one evidence
   trail. A blocked sonde is parked with its findings banked, not skipped.
5. **Record.** The compte-rendu is completed from the existing template and
   attached to the release candidate or its qualification issue before the
   recette session — never committed: it carries transient operational URLs
   and credentials (`docs/recette/referentiel-campagne-de-recette.md`,
   « Compte-rendu et données non versionnées »). The upstream issues the
   ledger names are closed (or evidenced) per its terms.

## Sonde anatomy

A sonde is command-decidable or it is not a sonde:

- **Fixture** — what must exist (project, repo, role, failing service).
- **Action** — the request or UI step, against the real contract.
- **Expected** — the observable that decides PASS/FAIL, ideally read back
  from a source of truth, not from the UI that performed the action.
- **Reserve** — when evidence is bounded (sequential instead of concurrent,
  happy path instead of failure path), the compte-rendu says so in a named
  ⚠️; a reserve is not a failure but it is never silent.

## Execution discipline

- **Contract before call.** Read the API contract from source — for the
  console, the SPA bundle `index-*.js` carries the full ts-rest contracts;
  grep `<operation>:{method,path,body}` and mirror the exact keys. A guessed
  verb or field returns 404/400, which proves nothing.
- **Token freshness.** An SPA-held token expires mid-campaign (`401 jwt
  expired`): refresh by driving any SPA tab, not by retrying the stale
  request.
- **Ground truth over rendered state.** A 2xx is a claim; the GET read-back
  is the evidence. When the claim touches infrastructure, check outside the
  application — Vault with an admin token, GitLab via its API, DB rows via
  psql — even when the UI shows success.
- **Invalid-payload probes.** Boundary probes with wrong payloads surface
  contract bugs (500 instead of 400) that the UI never exposes; file them
  as upstream candidates rather than campaign blockers.
- **Failure injection must hit the right layer.** Before arming a failure
  (unreachable URL, blocked service), trace which layer the code under test
  actually touches — a poisoned mirror source does not fail a GitLab group
  deletion. If honest injection needs shared-infrastructure downtime, ask,
  don't improvise; fall back to code-order + specs evidence with a ⚠️.

## Recording

- One sonde, one comment on the campaign issue: fixture, request/response,
  read-back, reserve if any. Never report PASS from memory; the ledger
  checkbox ticks only when the comment exists.
- Mid-campaign operator decisions (scope, ordering) are comments on the
  campaign issue — the card carries the state, not the chat.
- The compte-rendu (template
  `docs/recette/modele-compte-rendu-campagne-de-recette.md`, completed copy
  attached to the RC or its qualification issue — not committed) holds one
  table: sonde,
  corrective issue, statut ✅ / ⚠️ (named reserve) / 🚫 (out of scope, why),
  then incidents found along the way, nettoyage, and the verdict. Published
  before the recette session.
- Clean the fixture at campaign end; keep identities provisioned for the
  next campaign.
- Issues the ledger names close only after their sonde passes; attach the
  campaign evidence as a comment even when already closed by the team.
