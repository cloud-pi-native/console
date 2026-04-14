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
  private readonly storeScope: string

  constructor(
    scope: Scope,
    opts: { prefix?: string } = {},
  ) {
    this.scope = scope
    this.storeScope = opts.prefix ?? scope.chain.join('/')
  }

  async init(): Promise<void> {}

  async deinit(): Promise<void> {}

  async list(): Promise<string[]> {
    const rows = await globalPrisma.alchemyState.findMany({
      where: { scope: this.storeScope },
      orderBy: { key: 'asc' },
      select: { key: true },
    })
    return rows.map(r => r.key)
  }

  async count(): Promise<number> {
    return globalPrisma.alchemyState.count({ where: { scope: this.storeScope } })
  }

  async get(key: string): Promise<State | undefined> {
    const row = await globalPrisma.alchemyState.findUnique({
      where: { scope_key: { scope: this.storeScope, key } },
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

    const rows = await globalPrisma.alchemyState.findMany({
      where: { scope: this.storeScope, key: { in: ids } },
      select: { key: true, value: true },
    })

    for (const row of rows) {
      if (!row.value) continue
      const parsed = await deserializeState(this.scope, JSON.stringify(row.value))
      parsed.output[ResourceScope] = this.scope
      out[row.key] = parsed
    }
    return out
  }

  async all(): Promise<Record<string, State>> {
    const keys = await this.list()
    return this.getBatch(keys)
  }

  async set(key: string, value: State): Promise<void> {
    const serialized = await serialize(this.scope, value)
    if (!isInputJsonValue(serialized)) throw new Error('State is not JSON serializable')
    await globalPrisma.alchemyState.upsert({
      where: { scope_key: { scope: this.storeScope, key } },
      create: { scope: this.storeScope, key, value: serialized },
      update: { value: serialized },
    })
  }

  async delete(key: string): Promise<void> {
    try {
      await globalPrisma.alchemyState.delete({
        where: { scope_key: { scope: this.storeScope, key } },
      })
    } catch {}
  }
}
