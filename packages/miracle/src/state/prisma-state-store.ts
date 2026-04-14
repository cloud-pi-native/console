import type { Prisma } from '@prisma/client'
import type { Scope, State, StateStore, StateStoreType } from 'alchemy'
import { PrismaClient } from '@prisma/client'
import { deserializeState, ResourceScope, serialize } from 'alchemy'

const globalPrisma = new PrismaClient()

function isInputJsonValue(value: unknown): value is Prisma.InputJsonValue {
  if (value === null) return false
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return true
  if (Array.isArray(value)) return value.every(isInputJsonValue)
  if (t === 'object') return Object.values(value as Record<string, unknown>).every(isInputJsonValue)
  return false
}

export function prismaStateStore(opts: { prefix?: string } = {}): StateStoreType {
  return (scope: Scope) => new PrismaStateStore(scope, opts)
}

export class PrismaStateStore implements StateStore {
  private readonly scope: Scope
  private readonly prefix: string

  constructor(
    scope: Scope,
    opts: { prefix?: string } = {},
  ) {
    this.scope = scope
    this.prefix = opts.prefix ?? scope.chain.join('/')
  }

  async init(): Promise<void> {}

  async deinit(): Promise<void> {}

  private key(k: string) {
    return this.prefix ? `${this.prefix}/${k}` : k
  }

  async list(): Promise<string[]> {
    if (!this.prefix) {
      const rows = await globalPrisma.alchemyState.findMany({
        orderBy: { key: 'asc' },
        select: { key: true },
      })
      return rows.map(r => r.key)
    }

    const prefixWithSlash = `${this.prefix}/`
    const rows = await globalPrisma.alchemyState.findMany({
      where: { key: { startsWith: prefixWithSlash } },
      orderBy: { key: 'asc' },
      select: { key: true },
    })
    return rows.map(r => r.key.slice(prefixWithSlash.length))
  }

  async count(): Promise<number> {
    if (!this.prefix) return globalPrisma.alchemyState.count({ where: {} })
    return globalPrisma.alchemyState.count({ where: { key: { startsWith: `${this.prefix}/` } } })
  }

  async get(key: string): Promise<State | undefined> {
    const row = await globalPrisma.alchemyState.findUnique({
      where: { key: this.key(key) },
      select: { value: true },
    })
    if (!row?.value) return undefined
    const state = await deserializeState(this.scope, JSON.stringify(row.value))
    state.output[ResourceScope] = this.scope
    return state
  }

  async getBatch(ids: string[]): Promise<Record<string, State>> {
    const out: Record<string, State> = {}
    if (!ids.length) return out

    const keyed = ids.map(id => ({ id, dbKey: this.key(id) }))
    const rows = await globalPrisma.alchemyState.findMany({
      where: { key: { in: keyed.map(k => k.dbKey) } },
      select: { key: true, value: true },
    })

    const reverse = new Map<string, string>(keyed.map(k => [k.dbKey, k.id]))
    for (const row of rows) {
      const id = reverse.get(row.key)
      if (!id || !row.value) continue
      const parsed = await deserializeState(this.scope, JSON.stringify(row.value))
      parsed.output[ResourceScope] = this.scope
      out[id] = parsed
    }
    return out
  }

  async all(): Promise<Record<string, State>> {
    const keys = await this.list()
    return this.getBatch(keys)
  }

  async set(key: string, value: State): Promise<void> {
    const dbKey = this.key(key)
    const serialized = await serialize(this.scope, value)
    if (!isInputJsonValue(serialized)) throw new Error('State is not JSON serializable')
    await globalPrisma.alchemyState.upsert({
      where: { key: dbKey },
      create: { key: dbKey, value: serialized },
      update: { value: serialized },
    })
  }

  async delete(key: string): Promise<void> {
    try {
      await globalPrisma.alchemyState.delete({ where: { key: this.key(key) } })
    } catch {}
  }
}
