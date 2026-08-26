import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ensure } from './registry.utils'

describe('ensure', () => {
  it('should resolve when create succeeds', async () => {
    const reload = vi.fn()

    await expect(ensure({ create: async () => ({ status: HttpStatus.CREATED, data: null }), reload })).resolves.toBeUndefined()

    expect(reload).not.toHaveBeenCalled()
  })

  it('should reload once on a 409 conflict and never retry create', async () => {
    const onCollision = vi.fn()
    const create = vi.fn(async () => ({ status: HttpStatus.CONFLICT, data: null }))
    const reload = vi.fn(async () => {})

    await expect(ensure({ create, reload, onCollision })).resolves.toBeUndefined()

    expect(create).toHaveBeenCalledOnce()
    expect(onCollision).toHaveBeenCalledOnce()
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
