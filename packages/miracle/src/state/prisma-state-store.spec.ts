import { ResourceID, ResourceScope } from 'alchemy'
import { describe, expect, it, vi } from 'vitest'

const store = new Map<string, any>()

vi.mock('@prisma/client', () => {
  class PrismaClient {
    public readonly alchemyState = {
      count: async () => store.size,
      delete: async ({ where }: any) => {
        store.delete(where.key)
      },
      findMany: async () => {
        return Array.from(store.entries(), ([key, value]) => ({ key, value }))
      },
      findUnique: async ({ where, select }: any) => {
        const value = store.get(where.key)
        if (!value) return null
        if (select?.value) return { value }
        return { key: where.key, value }
      },
      upsert: async ({ where, create, update }: any) => {
        const existing = store.get(where.key)
        const next = existing ? update.value : create.value
        store.set(where.key, next)
        return { key: where.key, value: next }
      },
    }
  }

  return { PrismaClient }
})

describe('prisma state store', () => {
  it('roundtrips state by key prefix', async () => {
    store.clear()
    const scope: any = { chain: ['test', 'scope'], state: { set: vi.fn() } }
    const { PrismaStateStore } = await import('./prisma-state-store.js')
    const stateStore = new PrismaStateStore(scope, { prefix: 'pfx' })

    const state: any = {
      status: 'ok',
      kind: 'k',
      id: 'id1',
      fqn: 'fqn1',
      seq: 1,
      props: { a: 1 },
      data: {},
      output: { [ResourceID]: 'id1' },
    }

    await stateStore.init()
    await stateStore.set('id1', state)
    const loaded = await stateStore.get('id1')

    expect(loaded?.output?.[ResourceID]).toBe('id1')
    expect(loaded?.output?.[ResourceScope]).toBe(scope)
    expect(loaded?.props).toEqual({ a: 1 })
  })
})
