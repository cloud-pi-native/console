import { logger } from './logger.js'
import { getApi } from './utils.js'

export const groupRootCustomAttributeKey = 'cpn_projects_root_dir'
export const infraGroupCustomAttributeKey = 'cpn_infra_group'
export const projectGroupCustomAttributeKey = 'cpn_project_slug'
export const userIdCustomAttributeKey = 'cpn_user_id'
export const managedByConsoleCustomAttributeKey = 'cpn_managed_by_console'

export function customAttributesFilter(key: string, value: string) {
  return { [`custom_attributes[${key}]`]: value } as Record<string, string>
}

export async function upsertCustomAttribute(resource: 'groups' | 'projects' | 'users', id: number, key: string, value: string): Promise<void> {
  logger.info({ action: 'upsertCustomAttribute', resource, id, key }, 'Upsert custom attribute')
  logger.debug({ action: 'upsertCustomAttribute', resource, id, key, value }, 'Upsert custom attribute details')
  const api = getApi()
  try {
    if (resource === 'groups') {
      await api.GroupCustomAttributes.set(id, key, value)
    } else if (resource === 'projects') {
      await api.ProjectCustomAttributes.set(id, key, value)
    } else {
      await api.UserCustomAttributes.set(id, key, value)
    }
  } catch (err: any) {
    logger.warn({ action: 'upsertCustomAttribute', resource, id, key, err }, 'Failed to upsert custom attribute')
    throw err
  }
  logger.info({ action: 'upsertCustomAttribute', resource, id, key }, 'Custom attribute upserted')
}
