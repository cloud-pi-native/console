import { ResourceID, ResourceScope } from 'alchemy'
import { describe, expect, it, vi } from 'vitest'

const store = new Map<string, Map<string, any>>()

vi.mock('@prisma/client', () => {
  class PrismaClient {
    public readonly alchemyState = {
      count: async ({ where }: any = {}) => {
        if (!where?.scope) {
          let total = 0
          for (const scoped of store.values()) total += scoped.size
          return total
        }
        return store.get(where.scope)?.size ?? 0
      },
      delete: async ({ where }: any) => {
        const { scope, key } = where.scope_key
        store.get(scope)?.delete(key)
      },
      findMany: async ({ where }: any = {}) => {
        if (!where?.scope) {
          const rows: Array<{ scope: string, key: string, value: any }> = []
          for (const [scope, scoped] of store.entries()) {
            for (const [key, value] of scoped.entries()) rows.push({ scope, key, value })
          }
          return rows
        }
        const scoped = store.get(where.scope) ?? new Map<string, any>()
        const keys: string[] = where?.key?.in ? where.key.in : [...scoped.keys()]
        return keys
          .filter(k => scoped.has(k))
          .map(key => ({ scope: where.scope, key, value: scoped.get(key) }))
      },
      findUnique: async ({ where, select }: any) => {
        const { scope, key } = where.scope_key
        const value = store.get(scope)?.get(key)
        if (!value) return null
        if (select?.value) return { value }
        return { scope, key, value }
      },
      upsert: async ({ where, create, update }: any) => {
        const { scope, key } = where.scope_key
        const scoped = store.get(scope) ?? new Map<string, any>()
        store.set(scope, scoped)
        const existing = scoped.get(key)
        const next = existing ? update.value : create.value
        scoped.set(key, next)
        return { scope, key, value: next }
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
