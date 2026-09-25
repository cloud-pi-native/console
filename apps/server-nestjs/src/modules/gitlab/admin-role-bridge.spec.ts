import type { AdminRoleEventPayload } from '../events/app-events.service'
import { describe, expect, it, vi } from 'vitest'
import { GitlabService } from './gitlab.service'

function buildService({ adminGroupPath, auditorGroupPath }: { adminGroupPath?: string, auditorGroupPath?: string } = {}) {
  const datastore = {
    getAdminPluginConfig: vi.fn().mockImplementation(async (_plugin: string, key: string) => {
      if (key === 'adminGroupPath') return adminGroupPath ?? null
      if (key === 'auditorGroupPath') return auditorGroupPath ?? null
      return null
    }),
  }
  const gitlab = { upsertUser: vi.fn().mockResolvedValue({ id: 1 }) }
  const service = new GitlabService(
    datastore as never,
    gitlab as never,
    {} as never,
    {} as never,
  )
  return { service, gitlab }
}

const role = (oidcGroup: string | null): AdminRoleEventPayload => ({
  id: 'role-1',
  oidcGroup,
  members: [{ id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B' }],
})

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
