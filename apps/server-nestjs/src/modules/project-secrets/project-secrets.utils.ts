import { z } from 'zod'

export function hasEntries(record: Record<string, unknown>): boolean {
  return Object.keys(record).length > 0
}

const SecretValueSchema = z.union([
  z.string(),
  z.undefined().transform(() => ''),
  z.number().transform(String),
  z.bigint().transform(String),
  z.boolean().transform(String),
  z.null().transform(() => ''),
]).catch('')

export function parseSecretValue(value: string): string {
  return SecretValueSchema.parse(value)
}
