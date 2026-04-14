export * from './resources.js'

export interface VaultKvClient {
  write: (path: string, data: Record<string, any>) => Promise<void>
  read: (path: string, opts?: { throwIfNoEntry?: boolean }) => Promise<{ data: any } | undefined>
  destroy: (path: string) => Promise<void>
}
