import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ensure, isRegistryConflict } from './registry.utils'

describe('ensure', () => {
  it('should return the created data when create succeeds', async () => {
    const created = { id: 1 }
    const reload = vi.fn()

    await expect(ensure({ create: async () => ({ status: HttpStatus.CREATED, data: created }), reload })).resolves.toBe(created)

    expect(reload).not.toHaveBeenCalled()
  })

  it('should reload once on a 409 conflict and return the existing state, never retrying create', async () => {
    const onCollision = vi.fn()
    const existing = { id: 2 }
    const create = vi.fn(async () => ({ status: HttpStatus.CONFLICT, data: null }))
    const reload = vi.fn(async () => existing)

    await expect(ensure({ create, reload, onCollision })).resolves.toBe(existing)

    expect(create).toHaveBeenCalledOnce()
    expect(onCollision).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('should rethrow on a 409 whose reload finds nothing', async () => {
    const create = vi.fn(async () => ({ status: HttpStatus.CONFLICT, data: null }))
    const reload = vi.fn(async () => null)

    await expect(ensure({ create, reload })).rejects.toThrow('Harbor request failed (409)')

    expect(reload).toHaveBeenCalledOnce()
  })

  it('should surface reload errors', async () => {
    const error = new Error('Harbor retention policy failed (400)')

    await expect(ensure({ create: async () => ({ status: HttpStatus.CONFLICT, data: null }), reload: async () => { throw error } })).rejects.toBe(error)
  })

  it('should throw on other >= 400 statuses without reloading', async () => {
    const reload = vi.fn()

    await expect(ensure({ create: async () => ({ status: HttpStatus.FORBIDDEN, data: null }), reload })).rejects.toThrow('Harbor request failed (403)')

    expect(reload).not.toHaveBeenCalled()
  })
})

describe('isRegistryConflict', () => {
  it('should detect a plain 409', () => {
    expect(isRegistryConflict({ status: HttpStatus.CONFLICT, data: null })).toBe(true)
  })

  it('should detect a Harbor 400 body with code CONFLICT', () => {
    expect(isRegistryConflict({
      status: HttpStatus.BAD_REQUEST,
      data: { errors: [{ code: 'CONFLICT', message: 'project myproj already exists' }] },
    })).toBe(true)
  })

  it('should detect the code case-insensitively', () => {
    expect(isRegistryConflict({
      status: HttpStatus.BAD_REQUEST,
      data: { errors: [{ code: 'Conflict', message: 'already exists' }] },
    })).toBe(true)
  })

  it('should reject a 400 without the structured errors body', () => {
    expect(isRegistryConflict({ status: HttpStatus.BAD_REQUEST, data: null })).toBe(false)
    expect(isRegistryConflict({ status: HttpStatus.BAD_REQUEST, data: { message: 'bad request' } })).toBe(false)
    expect(isRegistryConflict({
      status: HttpStatus.BAD_REQUEST,
      data: { errors: [{ code: 'INVALIDREQUEST', message: 'bad request' }] },
    })).toBe(false)
  })

  it('should reject success and server-error statuses', () => {
    expect(isRegistryConflict({ status: HttpStatus.CREATED, data: null })).toBe(false)
    expect(isRegistryConflict({ status: HttpStatus.INTERNAL_SERVER_ERROR, data: null })).toBe(false)
  })
})
