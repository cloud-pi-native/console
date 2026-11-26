import { describe, expect, it, vi } from 'vitest'
import { createMemberRoleSync } from './member-role-sync.js'

describe('createMemberRoleSync', () => {
  it('ships both toggles of a burst in one patch carrying the final intent', async () => {
    const patchCalls: string[][] = []
    let releaseFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve })
    const patch = vi.fn((input: { roles: string[] }) => {
      patchCalls.push(input.roles)
      return firstGate
    })
    let synced = 0
    const sync = createMemberRoleSync(patch, () => { synced += 1 })

    const pendingA = sync.toggle(true, 'user-1', 'role-a', [])
    await Promise.resolve()
    const pendingB = sync.toggle(true, 'user-1', 'role-b', [])
    releaseFirst?.()
    await Promise.all([pendingA, pendingB])

    expect(patchCalls).toEqual([['role-a', 'role-b']])
    expect(synced).toBe(1)
  })

  it('reverts intent when a toggle is undone during the same burst', async () => {
    const patchCalls: string[][] = []
    const patch = vi.fn(async (input: { roles: string[] }) => { patchCalls.push(input.roles) })
    const sync = createMemberRoleSync(patch, () => {})

    const first = sync.toggle(true, 'user-1', 'role-a', [])
    await Promise.resolve()
    const second = sync.toggle(false, 'user-1', 'role-a', [])
    await Promise.all([first, second])

    expect(patchCalls).toEqual([[]])
  })

  it('serializes independent members without waiting on each other', async () => {
    const patch = vi.fn(async () => {})
    const sync = createMemberRoleSync(patch, () => {})

    await Promise.all([
      sync.toggle(true, 'user-1', 'role-a', []),
      sync.toggle(true, 'user-2', 'role-a', []),
    ])

    expect(patch).toHaveBeenCalledTimes(2)
  })

  it('propagates a patch failure and still unblocks the next toggle', async () => {
    const patch = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined)
    const sync = createMemberRoleSync(patch, () => {})

    const first = sync.toggle(true, 'user-1', 'role-a', [])
    await Promise.resolve()
    const second = sync.toggle(true, 'user-1', 'role-b', [])
    await expect(first).rejects.toThrow('boom')
    await expect(second).resolves.toBeUndefined()
  })
})
