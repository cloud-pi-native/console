import type { GitlabConfig } from '../../config/gitlab.config'
import type { AdminRoleEventPayload } from '../events/app-events.service'
import type { VaultClientService } from '../vault/vault-client.service'
import type { GitlabClientService } from './gitlab-client.service'
import type { GitlabDatastoreService } from './gitlab-datastore.service'
import { describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { GitlabService } from './gitlab.service'

const gitlabConfig = {
  token: 'token',
  url: 'https://gitlab.example.com',
  internalUrl: undefined,
  secretExposeInternalUrl: false,
  mirrorTokenExpirationDays: 365,
  mirrorTokenRotationThresholdDays: 250,
  projectRootDir: '/projects',
} satisfies GitlabConfig

function buildService({ adminGroupPath, auditorGroupPath }: { adminGroupPath?: string, auditorGroupPath?: string } = {}) {
  const datastore = mockDeep<GitlabDatastoreService>()
  datastore.getAdminPluginConfig.mockImplementation(async (_plugin: string, key: string) => {
    if (key === 'adminGroupPath') return adminGroupPath ?? null
    if (key === 'auditorGroupPath') return auditorGroupPath ?? null
    return null
  })
  const gitlab = mockDeep<GitlabClientService>()
  const service = new GitlabService(datastore, gitlab, mockDeep<VaultClientService>(), gitlabConfig)
  return { service, gitlab }
}

function role(oidcGroup: string | null): AdminRoleEventPayload {
  return {
    id: 'role-1',
    oidcGroup,
    members: [{ id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B' }],
  }
}

describe('gitlab adminRole event bridge', () => {
  it('skips roles outside managed group paths', async () => {
    const { service, gitlab } = buildService()
    await service.handleAdminRoleUpsert(role('/other'))
    expect(gitlab.upsertUser).not.toHaveBeenCalled()
  })

  it('flags admin for the admin group and auditor otherwise', async () => {
    const { service, gitlab } = buildService({ adminGroupPath: '/console/admin' })
    await service.handleAdminRoleUpsert(role('/console/admin'))
    expect(gitlab.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ admin: true }), expect.anything())

    await service.handleAdminRoleUpsert(role('/console/readonly'))
    expect(gitlab.upsertUser).toHaveBeenLastCalledWith(expect.objectContaining({ auditor: true, admin: undefined }), expect.anything())
  })

  it('revoke (delete) clears the flags', async () => {
    const { service, gitlab } = buildService()
    await service.handleAdminRoleDelete(role('/console/admin'))
    expect(gitlab.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ admin: false }), expect.anything())
  })
})
