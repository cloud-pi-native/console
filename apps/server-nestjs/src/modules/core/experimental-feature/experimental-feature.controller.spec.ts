import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ADMIN_PERMS, ExperimentalFeatureTargetSchema } from '@cpn-console/shared'
import { UnauthorizedException } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AuthService } from '../../infrastructure/auth/auth.service'
import { UserPermissionPolicy } from '../../infrastructure/permission/user/user-policy.service'
import { UserPermissionService } from '../../infrastructure/permission/user/user.service'
import { ExperimentalFeatureController } from './experimental-feature.controller'
import { ExperimentalFeatureService } from './experimental-feature.service'

const actorId = '11111111-1111-4111-8111-111111111111'
const targetId = '22222222-2222-4222-8222-222222222222'
const url = '/api/v1/experimental-features/opencds'

describe('experimentalFeatureController HTTP', () => {
  let app: NestFastifyApplication
  let auth: DeepMockProxy<AuthService>
  let service: DeepMockProxy<ExperimentalFeatureService>

  beforeEach(async () => {
    auth = mockDeep<AuthService>()
    service = mockDeep<ExperimentalFeatureService>()
    auth.authenticate.mockResolvedValue({ userId: actorId, adminPermissions: ADMIN_PERMS.MANAGE_SYSTEM })
    const module = await Test.createTestingModule({
      controllers: [ExperimentalFeatureController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ExperimentalFeatureService, useValue: service },
        UserPermissionPolicy,
        UserPermissionService,
      ],
    }).compile()
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterEach(async () => { await app?.close() })

  it('refuses anonymous access', async () => {
    auth.authenticate.mockRejectedValue(new UnauthorizedException())
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401)
    expect(service.list).not.toHaveBeenCalled()
  })

  it('refuses a project member without system permissions', async () => {
    auth.authenticate.mockResolvedValue({ userId: actorId, adminPermissions: 0n })
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(403)
    expect(service.list).not.toHaveBeenCalled()
  })

  it('allows reading but not authorizing with read-only system permissions', async () => {
    auth.authenticate.mockResolvedValue({ userId: actorId, adminPermissions: ADMIN_PERMS.LIST_SYSTEM })
    service.list.mockResolvedValue([])
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: `${url}/authorizations`, payload: { kind: 'instance', id: 'console' } })).statusCode).toBe(403)
    expect(service.authorize).not.toHaveBeenCalled()
  })

  it('rejects malformed scope input before calling the service', async () => {
    expect((await app.inject({ method: 'POST', url: `${url}/authorizations`, payload: { kind: 'project', id: 'invalid' } })).statusCode).toBe(400)
    expect(service.authorize).not.toHaveBeenCalled()
  })

  it('does not accept a caller-supplied author', async () => {
    expect((await app.inject({ method: 'POST', url: `${url}/authorizations`, payload: { kind: 'instance', id: 'console', actorId: targetId } })).statusCode).toBe(400)
    expect(service.authorize).not.toHaveBeenCalled()
  })

  it('records the authenticated author and never reports a request as applied', async () => {
    service.request.mockResolvedValue({
      id: targetId,
      featureKey: 'opencds',
      scopeKind: 'instance',
      scopeId: 'console',
      requested: true,
      revision: 1,
      events: [{ revision: 1, action: 'activate', actorId, createdAt: new Date('2026-01-01T00:00:00Z') }],
    })
    const response = await app.inject({ method: 'PATCH', url: `${url}/${targetId}/request`, payload: { requested: true, expectedRevision: 0 } })
    expect(response.statusCode).toBe(200)
    expect(service.request).toHaveBeenCalledWith(targetId, { requested: true, expectedRevision: 0 }, actorId)
    expect(ExperimentalFeatureTargetSchema.parse(response.json()).application).toBe('not-observed')
  })

  it('rejects malformed target IDs and missing revisions', async () => {
    expect((await app.inject({ method: 'PATCH', url: `${url}/invalid/request`, payload: { requested: true, expectedRevision: 0 } })).statusCode).toBe(400)
    expect((await app.inject({ method: 'PATCH', url: `${url}/${targetId}/request`, payload: { requested: true } })).statusCode).toBe(400)
    expect(service.request).not.toHaveBeenCalled()
  })
})
