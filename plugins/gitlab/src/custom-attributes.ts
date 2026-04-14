export const groupRootCustomAttributeKey = 'cpn_projects_root_dir'
export const infraGroupCustomAttributeKey = 'cpn_infra_group'
export const projectGroupCustomAttributeKey = 'cpn_project_slug'
export const userIdCustomAttributeKey = 'cpn_user_id'
export const managedByConsoleCustomAttributeKey = 'cpn_managed_by_console'

export function customAttributesFilter(key: string, value: string) {
  return { [`custom_attributes[${key}]`]: value } as Record<string, string>
}
