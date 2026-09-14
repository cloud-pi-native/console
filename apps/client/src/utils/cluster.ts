import { ClusterDetailsSchema } from '@cpn-console/shared'

export function getClusterLabelValidationMessage(label: string) {
  if (!label) return undefined

  const result = ClusterDetailsSchema.pick({ label: true }).safeParse({ label })
  return result.success ? undefined : result.error.issues[0]?.message
}
