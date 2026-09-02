import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { makeConflictResponse, makeHttpConflictResponse } from './registry-testing.utils'
import { ensure, isRegistryConflict } from './registry.utils'

describe('ensure', () => {
  it('should always reload on success to return the fresh object', async () => {
    const created = { id: 1 }
    const existing = { id: 2 }
    const reload = vi.fn(async () => existing)

    await expect(ensure({ create: async () => ({ status: HttpStatus.CREATED, data: created }), reload })).resolves.toBe(existing)

    expect(reload).toHaveBeenCalledOnce()
  })

  it('should reload once on a 400 CONFLICT and return the existing state, never retrying create', async () => {
    const onCollision = vi.fn()
    const existing = { id: 2 }
    const create = vi.fn(async () => makeConflictResponse<{ id: number }>())
    const reload = vi.fn(async () => existing)

    await expect(ensure<{ id: number }>({ create, reload, onCollision })).resolves.toBe(existing)

    expect(create).toHaveBeenCalledOnce()
    expect(onCollision).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('should reload once on a real HTTP 409 and return the existing state', async () => {
    const existing = { id: 2 }
    const create = vi.fn(async () => makeHttpConflictResponse<{ id: number }>())
    const reload = vi.fn(async () => existing)

    await expect(ensure<{ id: number }>({ create, reload })).resolves.toBe(existing)

    expect(create).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('should rethrow on a 400 CONFLICT whose reload finds nothing', async () => {
    const create = vi.fn(async () => makeConflictResponse<undefined>())
    const reload = vi.fn(async () => undefined)

    await expect(ensure({ create, reload })).rejects.toThrow('Harbor request failed (400)')

    expect(reload).toHaveBeenCalledOnce()
  })

  it('should surface reload errors', async () => {
    const error = new Error('Harbor retention policy failed (400)')

    await expect(ensure({ create: async () => makeConflictResponse<null>(), reload: async () => { throw error } })).rejects.toBe(error)
  })

  it('should throw on other >= 400 statuses without reloading', async () => {
    const reload = vi.fn()

    await expect(ensure({ create: async () => ({ status: HttpStatus.FORBIDDEN, data: null }), reload })).rejects.toThrow('Harbor request failed (403)')

    expect(reload).not.toHaveBeenCalled()
  })
})

describe('isRegistryConflict', () => {
  it('should accept a plain 409 — Harbor project create signals collisions with it', () => {
    expect(isRegistryConflict({ status: HttpStatus.CONFLICT, data: null })).toBe(true)
  })

  it('should detect a Harbor 400 body with code CONFLICT', () => {
    expect(isRegistryConflict({
      status: HttpStatus.BAD_REQUEST,
      data: { errors: [{ code: 'CONFLICT', message: 'project myproj already exists' }] },
    })).toBe(true)
  })

  it('should reject a code that is not the exact CONFLICT string', () => {
    expect(isRegistryConflict({
      status: HttpStatus.BAD_REQUEST,
      data: { errors: [{ code: 'Conflict', message: 'already exists' }] },
    })).toBe(false)
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
