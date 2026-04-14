import { PROVIDERS } from 'alchemy'
import { describe, expect, it, vi } from 'vitest'
import './resources.js'

function createCtx<Output>(phase: string, output?: Output) {
  const ctx: any = {
    phase,
    output,
    create: vi.fn((next: Output) => {
      ctx.output = next
      return {}
    }),
    destroy: vi.fn(() => ({})),
  }
  return ctx
}

describe('vault resources', () => {
  it('vaultKvSecret create: writes secret when missing', async () => {
    const provider = PROVIDERS.get('vault:KvSecret')
    if (!provider) throw new Error('Missing provider')

    const vault = {
      read: vi.fn().mockResolvedValue(undefined),
      write: vi.fn(),
      destroy: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'secret-x', { client: vault, path: 'p', data: { a: 1 } })

    expect(vault.write).toHaveBeenCalledWith('p', { a: 1 })
    expect(ctx.create).toHaveBeenCalledWith({ path: 'p' })
  })

  it('vaultKvSecret update: avoids write when secret is identical', async () => {
    const provider = PROVIDERS.get('vault:KvSecret')
    if (!provider) throw new Error('Missing provider')

    const vault = {
      read: vi.fn().mockResolvedValue({ data: { a: 1 } }),
      write: vi.fn(),
      destroy: vi.fn(),
    }

    const ctx = createCtx('update', { path: 'p', data: { a: 1 } })
    await provider.handler.call(ctx, 'secret-x', { client: vault, path: 'p', data: { a: 1 } })

    expect(vault.write).not.toHaveBeenCalled()
    expect(ctx.create).toHaveBeenCalledWith({ path: 'p' })
  })
})
