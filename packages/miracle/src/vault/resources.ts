import type { VaultKvClient } from './index.js'
import { Resource } from 'alchemy'

interface ResourceContext<Output> {
  phase: unknown
  output?: Output
  create: (output: Output) => Resource<string>
  destroy: () => Resource<string>
}

export interface VaultKvSecretProps {
  client: VaultKvClient
  path: string
  data: any
}

export interface VaultKvSecretOutput {
  path: string
}

export const VaultKvSecret = Resource('vault:KvSecret', async function (this: ResourceContext<VaultKvSecretOutput>, _id: string, props: VaultKvSecretProps) {
  const phase = this.phase as string
  if (phase === 'create' || phase === 'update') {
    const current = await props.client.read(props.path, { throwIfNoEntry: false })
    const currentJson = current?.data ? JSON.stringify(current.data) : undefined
    const nextJson = props.data ? JSON.stringify(props.data) : undefined
    if (currentJson !== nextJson) {
      await props.client.write(props.path, props.data)
    }
    return this.create({ path: props.path })
  }
  if (phase === 'delete') {
    return this.destroy()
  }
  throw new Error(`Unexpected phase: ${phase}`)
})
