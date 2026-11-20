import { z } from 'zod'

export async function maybeCollectServiceSecrets<T extends Record<string, any>>(
  projectId: string,
  group: string,
  service?: { secrets: (projectId: string) => Promise<T> },
): Promise<Record<string, Record<string, string>>> {
  if (!service) return {}
  const raw = await service.secrets(projectId)
  const secrets = stringifySecretData(raw)
  return Object.keys(secrets).length ? { [group]: secrets } : {}
}

const SecretValueSchema = z.union([
  z.string(),
  z.undefined().transform(() => ''),
  z.number().transform(String),
  z.bigint().transform(String),
  z.boolean().transform(String),
  z.null().transform(() => ''),
]).catch('')

export function parseSecretValue(value: unknown): string {
  return SecretValueSchema.parse(value)
}

export function stringifySecretData(data: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    out[key] = parseSecretValue(value)
  }
  return out
}
