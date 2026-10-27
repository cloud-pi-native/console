---
name: cpn-recette
description:
  "Use when running a recette (HP validation) campaign on the CPiN console:
  probe the fixes of a release candidate on the HP platform, with API-driven
  ground truth and evidence on the record."
license: Apache-2.0
metadata:
  version: 1.0.0
---

# Recette HP

Validate a release candidate on the HP platform before the recette session.
The output is evidence-backed probe results and a compte-rendu, not
impressions.

## Prerequisites

- The candidate build is deployed: check version and base first, never probe
  the wrong build:

```bash
curl -s https://console.dso.cpin-hp.numerique-interieur.fr/api/v1/version
# compare with gh api repos/cloud-pi-native/console/compare/<rc-tag>...main
```

- A drivable browser exists (automation Chrome with
  `--remote-debugging-port=9222`, session survives in its profile). Without
  it, park BLOCKED with the finding banked — DNS/reachability and build
  validity checks still run.
- Campaign identities exist on the platform (provisioned declaratively in
  the socle values `gitops/envs/conf-dso/apps/keycloak*/templates/users.yaml`
  — merge + Argocd sync mints them; password is set at first login).
- **Scope gate** — destructive sondes (archive, purge, anything mutating
  shared services) run only after the non-destructive pass is reviewed.

## Run a sonde

1. Read the contract before any call: the SPA bundle carries the full
   ts-rest contracts — grep `index-*.js` for `<operation>:{method,path,body}`
   and mirror the exact body keys (a guessed verb/field is a 404/400, not
   knowledge).

```bash
curl -s https://console.dso.cpin-hp.numerique-interieur.fr/assets/<index-*.js> -o /tmp/spa.js
grep -oE 'patchMembers:\{method:"PATCH",path:"",body:\{[^}]{0,120}' /tmp/spa.js
```

2. Capture the SPA bearer token: register a fetch shim that records the
   `Authorization` header via
   `Page.addScriptToEvaluateOnNewDocument` (the shim dies on reload —
   re-register in the same CDP session each time). Refresh the token by
   clicking any SPA tab; a 401 `jwt expired` means stale token, not wrong
   request.
3. Probe with the real body shape, then **read back** the object — a 2xx is
   a claim, the GET is the evidence.
4. Cross-check ground truth outside the console when the claim touches
   infrastructure: Vault via `kubectl exec conf-dso-vault-0` with the root
   token from `conf-dso-vault-keys` (mirror secrets live under
   `forge-dso/forge-mi/projects/<slug>/`, not the project mount), GitLab via
   its API with the console server's token, DB rows via the console
   Postgres.

## Known traps

- `z.coerce.string()` schemas accept anything; a CSV like `"256,512"` can
  500 in the service (`BigInt`). Probe boundaries with invalid payloads.
- The UI can lag the API state (stale table after a mutation) — trust the
  API read-back over the rendered page.
- `gh pr checks --watch` on fork PRs: `build` jobs fail on ghcr push
  (`denied: Write organization package`) — fork artifact, compilation/lint
  /unit results are the real signal; say so in a PR comment for reviewers.
- Org repos allow direct branch push as `shikanime`; forks of socle repos
  are disabled — branch on upstream directly.
- `.invalid` URLs poison a mirror's *source*, not GitLab's delete path:
  archive with failing GitLab needs a different failure injector.

## Record

- One sonde, one comment on the campaign issue: fixture, request/response,
  read-back, reserve if the evidence is bounded. Never report PASS from
  memory.
- Tick the campaign issue's ledger checkbox per sonde; scope decisions the
  user makes mid-campaign go on the card as a comment too.
- End the campaign with a compte-rendu versioned in the repo
  (`docs/recette-<version>.md`): one table (sonde, corrective issue,
  statut ✅/⚠️/🚫), incidents, nettoyage, verdict for the recette session.
  ⚠️ carries a named reserve — what would strengthen the evidence.
- Close upstream issues the ledger names only after their sonde passes;
  attach the HP evidence as a comment even when already closed.
- Clean the fixture project at the end (archive purges GitLab/Vault/roles);
  keep the campaign identities for the next campaign.
