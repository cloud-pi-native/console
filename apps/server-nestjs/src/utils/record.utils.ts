export function hasEntries(record: Record<string, unknown>): boolean {
  return Object.keys(record).length > 0
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
