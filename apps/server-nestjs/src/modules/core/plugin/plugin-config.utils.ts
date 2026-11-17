import type { PermissionTarget, PluginConfig, PluginsUpdateBody } from '@cpn-console/shared'
import type { ServiceInfos } from './plugin.types'
import { atomicValidators, DEFAULT, DISABLED, ENABLED, pluginConfig } from '@cpn-console/shared'
import { z } from 'zod'

export const specificallyDisabled = (value?: string): boolean | undefined => value ? value === DISABLED : undefined
export const specificallyEnabled = (value?: string): boolean | undefined => value ? value === ENABLED : undefined
export const defaultOrNullish = (value?: string): boolean => value ? DEFAULT === value : true

const editStrippersGenerator = pluginConfig.transform((config) => {
  const project = { user: z.object({}), admin: z.object({}) }
  let global = z.object({})
  for (const item of config.project) {
    const validator = atomicValidators[item.kind].optional()
    if (item.permissions.user.write) project.user = project.user.merge(z.object({ [item.key]: validator }))
    if (item.permissions.admin.write) project.admin = project.admin.merge(z.object({ [item.key]: validator }))
  }
  for (const item of config.global ?? []) {
    if (item.permissions.admin.write) {
      global = global.merge(z.object({ [item.key]: atomicValidators[item.kind].optional() }))
    }
  }
  return { project, global }
})

export function buildEditStrippers(services: ServiceInfos[]): {
  project: Record<'user' | 'admin', z.ZodType<PluginsUpdateBody>>
  global: z.ZodType<PluginsUpdateBody>
} {
  const project = { user: z.object({}), admin: z.object({}) }
  let global = z.object({})
  for (const service of services) {
    if (!service.config) continue
    const editZod = editStrippersGenerator.parse(service.config)
    global = global.merge(z.object({ [service.name]: editZod.global.default({}) }))
    project.admin = project.admin.merge(z.object({ [service.name]: editZod.project.admin.default({}) }))
    project.user = project.user.merge(z.object({ [service.name]: editZod.project.user.default({}) }))
  }
  return { project, global }
}

interface ConfigRecord {
  pluginName: string
  key: string
  value: string
}

interface ServiceManifestParams {
  service: ServiceInfos
  data: { project?: ConfigRecord[], global?: ConfigRecord[] }
  permissionTarget: PermissionTarget
  select: Partial<Record<keyof PluginConfig, boolean>>
}

export function populateServiceManifest({ service, data, select, permissionTarget }: ServiceManifestParams): Partial<PluginConfig> {
  const manifest = structuredClone(service.config)
  const selected: Partial<PluginConfig> = {}
  for (const scope of ['project', 'global'] as const) {
    if (!select[scope] || !manifest?.[scope]) continue
    selected[scope] = manifest[scope].filter(item => item.permissions[permissionTarget].read || item.permissions[permissionTarget].write).map((item) => {
      const row = data[scope]?.find(candidate => candidate.pluginName === service.name && candidate.key === item.key)
      if (item.kind === 'switch') {
        const value = atomicValidators.switch.safeParse(row?.value)
        item.value = value.success ? value.data : DEFAULT
      } else {
        item.value = z.coerce.string().parse(row?.value ?? item.value ?? '')
      }
      return item
    })
  }
  return selected
}
