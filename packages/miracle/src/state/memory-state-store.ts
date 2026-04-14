import type { State, StateStore } from 'alchemy'

export class MemoryStateStore implements StateStore {
  private readonly stateMap: Map<string, State> = new Map()

  constructor(private readonly options: { prefix?: string } = {}) {}

  async init(): Promise<void> {}

  async deinit(): Promise<void> {}

  private get prefix() {
    return this.options.prefix ?? ''
  }

  private key(key: string) {
    return this.prefix ? `${this.prefix}/${key}` : key
  }

  async list(): Promise<string[]> {
    const prefix = this.prefix
    if (!prefix) return [...this.stateMap.keys()]

    const prefixWithSlash = `${prefix}/`
    const out: string[] = []
    for (const k of this.stateMap.keys()) {
      if (k.startsWith(prefixWithSlash)) {
        out.push(k.slice(prefixWithSlash.length))
      }
    }
    return out
  }

  async count(): Promise<number> {
    return (await this.list()).length
  }

  async get(key: string): Promise<State | undefined> {
    return this.stateMap.get(this.key(key))
  }

  async getBatch(ids: string[]): Promise<Record<string, State>> {
    const out: Record<string, State> = {}
    for (const id of ids) {
      const value = await this.get(id)
      if (value) out[id] = value
    }
    return out
  }

  async all(): Promise<Record<string, State>> {
    const keys = await this.list()
    return this.getBatch(keys)
  }

  async set(key: string, value: State): Promise<void> {
    this.stateMap.set(this.key(key), value)
  }

  async delete(key: string): Promise<void> {
    this.stateMap.delete(this.key(key))
  }
}
