import config from './config.js'
import { logger } from './logger.js'

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
  const res = await fetch(`${config().internalUrl}/api/v4/${resource}/${id}/custom_attributes/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'PRIVATE-TOKEN': config().token,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ value }) as any,
  })
  if (!res.ok) {
    logger.warn({ action: 'upsertCustomAttribute', resource, id, key, status: res.status }, 'Failed to upsert custom attribute')
    throw new Error(`Failed to upsert custom attribute (${resource}/${id}) status=${res.status}`)
  }
  logger.info({ action: 'upsertCustomAttribute', resource, id, key }, 'Custom attribute upserted')
}
