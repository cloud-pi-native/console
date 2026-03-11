import { ProjectWithDetails } from "./vault-datastore.service"

export function generateTechnicalReadOnlyPolicyName(project: ProjectWithDetails) {
    return `tech--${project.slug}--ro`
}

export function generateAppAdminPolicyName(project: ProjectWithDetails) {
    return  `app--${project.slug}--admin`
}

export function generateZoneName(name: string) {
    return `zone-${name}`
}