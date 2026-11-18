import { describe, expect, it, vi } from 'vitest'
import { additionSet, evictionSet, reconcile } from './reconcile.js'

describe('reconcile set helpers', () => {
  it('computes additions and evictions from the same keys', () => {
    const current = new Set(['keep', 'stale'])

    expect([...additionSet(current, new Set(['keep', 'new']))]).toEqual(['new'])
    expect([...evictionSet(current, new Set(['keep', 'owner']))]).toEqual(['stale'])
  })
})

describe('reconcile', () => {
  it('adds what is missing and removes what is no longer desired', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)

    await reconcile({
      current: [{ id: 'keep' }, { id: 'stale' }],
      desired: new Set(['keep', 'new']),
      keyOf: item => item.id,
      add,
      remove,
    })

    expect(add).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledWith('new')
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith({ id: 'stale' })
  })

  it('keeps a protected entity without creating it', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)

    await reconcile({
      current: [{ id: 'owner' }, { id: 'stale' }],
      desired: new Set(['new']),
      keep: new Set(['owner']),
      keyOf: item => item.id,
      add,
      remove,
    })

    expect(add).toHaveBeenCalledExactlyOnceWith('new')
    expect(remove).toHaveBeenCalledExactlyOnceWith({ id: 'stale' })
  })
})
