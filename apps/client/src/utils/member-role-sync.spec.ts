import { describe, expect, it, vi } from 'vitest'
import { createMemberRoleSync } from './member-role-sync.js'

describe('createMemberRoleSync', () => {
  const gatedPatch = () => {
    const calls: string[][] = []
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    const patch = vi.fn(async (input: { roles: string[] }) => {
      calls.push(input.roles)
      if (calls.length === 1) {
        markStarted?.()
        await gate
      }
    })
    return { calls, patch, started, releaseFirst: () => release?.() }
  }

  it('keeps the in-flight roles as the base for a toggle during the patch', async () => {
    const { calls, patch, started, releaseFirst } = gatedPatch()
    let synced = 0
    const sync = createMemberRoleSync(patch, () => { synced += 1 })

    const first = sync.toggle(true, 'user-1', 'role-a', [])
    await started
    const second = sync.toggle(true, 'user-1', 'role-b', [])
    releaseFirst()
    await Promise.all([first, second])

    expect(calls).toEqual([['role-a'], ['role-a', 'role-b']])
    expect(synced).toBe(2)
  })

  it('reverts intent when a toggle is undone during the in-flight patch', async () => {
    const { calls, patch, started, releaseFirst } = gatedPatch()
    const sync = createMemberRoleSync(patch, () => {})

    const first = sync.toggle(true, 'user-1', 'role-a', [])
    await started
    const second = sync.toggle(false, 'user-1', 'role-a', [])
    releaseFirst()
    await Promise.all([first, second])

    expect(calls).toEqual([['role-a'], []])
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
