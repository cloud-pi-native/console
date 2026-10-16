import type { CreateRepository, UpdateRepository } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'

/**
 * Builds the row persisted on creation from the already-parsed body. The
 * discriminated union guarantees a public repository carries no credentials, and
 * `externalToken` is never a database column — the external credential is written to
 * Vault by the GitLab mirroring reconciliation (handled with the sync route, a
 * separate change). `externalRepoUrl` and the deployment fields are already parsed to
 * exact strings upstream, so the row is a straight mapping.
 */
export function buildRepositoryCreateData(
  projectId: string,
  createRepositoryInfos: CreateRepository,
): Prisma.RepositoryUncheckedCreateInput {
  return {
    projectId,
    internalRepoName: createRepositoryInfos.internalRepoName,
    externalRepoUrl: createRepositoryInfos.externalRepoUrl,
    externalUserName: createRepositoryInfos.isPrivate ? createRepositoryInfos.externalUserName : '',
    isInfra: createRepositoryInfos.isInfra,
    isPrivate: createRepositoryInfos.isPrivate,
    deployRevision: createRepositoryInfos.deployRevision,
    deployPath: createRepositoryInfos.deployPath,
    helmValuesFiles: createRepositoryInfos.helmValuesFiles,
  }
}

/**
 * Builds the partial update applied to the row. Mirrors the legacy sanitization:
 * `externalToken` is never persisted, and turning a repository public
 * (`isPrivate === false`) leaves its stored `externalUserName` untouched.
 */
export function buildRepositoryUpdateData(
  updateRepositoryInfos: UpdateRepository,
): Prisma.RepositoryUncheckedUpdateInput {
  const { externalToken: _externalToken, externalUserName, isPrivate, ...rest } = updateRepositoryInfos

  const updateData: Prisma.RepositoryUncheckedUpdateInput = { ...rest }

  if (isPrivate !== undefined) {
    updateData.isPrivate = isPrivate
  }

  if (isPrivate !== false && externalUserName !== undefined) {
    updateData.externalUserName = externalUserName
  }

  return updateData
}

/**
 * What a PUT body asks to do with the repository's Vault mirror credentials.
 *
 * The external token is never stored in the database (it only lives in Vault), so a
 * partial update expresses one of three intents:
 * - `set`   : the body carries a new token → overwrite it in Vault.
 * - `clear` : the body sets `isPrivate: false` (repo made public) → remove the creds.
 * - `keep`  : the body carries no token → leave the stored secret unchanged.
 *
 * How "keep" is signalled differs from the legacy server: legacy sent a placeholder
 * string ('fakeToken') as the token value to mean "unchanged" — dropped in
 * `apps/server/src/resources/repository/router.ts` (`updateRepository`), then the empty
 * token falls back to the stored password in the GitLab plugin
 * (`plugins/gitlab/src/repositories.ts`, `ensureRepositoryExists`). Here the client
 * simply omits the field, so an absent (or empty) token is what selects `keep`.
 */
export type RepositoryMirrorCredentialUpdate
  = | { kind: 'set', externalToken: string }
    | { kind: 'clear' }
    | { kind: 'keep' }

/**
 * Parses the credential intent out of a partial update body. An absent or empty token
 * means "unchanged" (the legacy `token || existing` fallback), so it never triggers a
 * write. `isPrivate === false` wins: making a repository public clears its creds.
 */
export function parseRepositoryCredentialUpdate(
  updateRepositoryInfos: UpdateRepository,
): RepositoryMirrorCredentialUpdate {
  if (updateRepositoryInfos.isPrivate === false) {
    return { kind: 'clear' }
  }
  if (updateRepositoryInfos.externalToken) {
    return { kind: 'set', externalToken: updateRepositoryInfos.externalToken }
  }
  return { kind: 'keep' }
}
