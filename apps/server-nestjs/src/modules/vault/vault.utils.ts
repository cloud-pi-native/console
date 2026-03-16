import type { ProjectWithDetails } from './vault-datastore.service'

export function generateTechReadOnlyPolicyName(project: ProjectWithDetails) {
  return `tech--${project.slug}--ro`
}

export function generateAppAdminPolicyName(project: ProjectWithDetails) {
  return `app--${project.slug}--admin`
}

export function generateZoneName(name: string) {
  return `zone-${name}`
}

export function generateZoneTechReadOnlyPolicyName(zoneName: string) {
  return `tech--${generateZoneName(zoneName)}--ro`
}
