import fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import * as userBusiness from '../resources/user/business.js'
import * as settingsBusiness from '../resources/system/settings/business.js'
import { authUser } from './controller.js'
import type { UserDetails } from '../types/index.js'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'

const logViaSessionMock = vi.spyOn(userBusiness, 'logViaSession')
const getSystemSettingsMock = vi.spyOn(settingsBusiness, 'getSystemSettings')

async function buildTestApp(user: UserDetails, adminPerms: bigint) {
  const app = fastify()

  app.register(fastifyCookie)
  app.register(fastifySession, {
    cookieName: 'sessionId',
    secret: 'a-very-strong-secret-with-more-than-32-char',
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 1_800_000,
    },
  })

  app.get('/auth-test', async (req, reply) => {
    req.session.user = user
    const result = await authUser(req)
    return reply.send({
      adminPermissions: result.adminPermissions.toString(),
    })
  })

  logViaSessionMock.mockResolvedValueOnce({ user, adminPerms } as any)

  return app
}

describe('authUser effective admin permissions via legacy default permissions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns raw permissions when refined-permissions is off', async () => {
    const rawPerms = ADMIN_PERMS.MANAGE
    const expected = rawPerms | ADMIN_PERMS.MANAGE_PROJECTS | ADMIN_PERMS.MANAGE_USERS | ADMIN_PERMS.MANAGE_STAGES | ADMIN_PERMS.LIST_ZONES
    const user: UserDetails = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      type: 'human',
      groups: [],
    }

    getSystemSettingsMock.mockResolvedValueOnce([{ key: 'refined-permissions', value: 'off' }] as any)

    const app = await buildTestApp(user, rawPerms)
    const response = await app.inject({
      method: 'GET',
      url: '/auth-test',
    })

    const body = response.json() as { adminPermissions: string }
    expect(body.adminPermissions).toEqual(expected.toString())

    await app.close()
  })

  it('does not add ManageProjects when refined-permissions is on and MANAGE not set', async () => {
    const rawPerms = ADMIN_PERMS.LIST_STAGES
    const expected = rawPerms
    const user: UserDetails = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      type: 'human',
      groups: [],
    }

    getSystemSettingsMock.mockResolvedValueOnce([{ key: 'refined-permissions', value: 'on' }] as any)

    const app = await buildTestApp(user, rawPerms)
    const response = await app.inject({
      method: 'GET',
      url: '/auth-test',
    })

    const body = response.json() as { adminPermissions: string }
    expect(body.adminPermissions).toEqual(expected.toString())

    await app.close()
  })
})
