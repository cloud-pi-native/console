import type { PermissionTarget, PluginConfig } from '@cpn-console/shared'
import { atomicValidators, DEFAULT, pluginConfig } from '@cpn-console/shared'
import { z } from 'zod'
import { objectEntries } from './utils/utils.js'

export type PluginsManifests = Record<string, PluginConfig>
export const pluginsManifests: PluginsManifests = {}

export const editStrippersGenerator = pluginConfig.transform((arg) => {
  const project = {
    user: z.object({}),
    admin: z.object({}),
  }
  let global = z.object({})

  for (const item of arg.project) {
    const zAny = atomicValidators[item.kind].optional()
    if (item.permissions.user.write) {
      project.user = project.user.merge(z.object({ [item.key]: zAny }))
    }
    if (item.permissions.admin.write) {
      project.admin = project.admin.merge(z.object({ [item.key]: zAny }))
    }
  }

  for (const item of arg.global || []) {
    if (item.permissions.admin.write) {
      const zAny = atomicValidators[item.kind].optional()
      global = global.merge(z.object({ [item.key]: zAny }))
    }
  }
  return { project, global }
})

export const editStrippers = {
  project: {
    admin: z.object({}),
    user: z.object({}),
  },
  global: z.object({}),
}

export function addPlugin(pluginName: string, config: PluginConfig, editStrippersObject: typeof editStrippers) {
  const editZod = editStrippersGenerator.parse(config)
  pluginsManifests[pluginName] = config
  editStrippersObject.global = editStrippersObject.global.merge(z.object({ [pluginName]: editZod.global.default({}) }))
  editStrippersObject.project.admin = editStrippersObject.project.admin.merge(z.object({ [pluginName]: editZod.project.admin.default({}) }))
  editStrippersObject.project.user = editStrippersObject.project.user.merge(z.object({ [pluginName]: editZod.project.user.default({}) }))
}

interface Row { pluginName: string, key: string, value: string }
interface PopulateManifestsParams {
  data: { project?: Row[], global?: Row[] }
  permissionTarget: PermissionTarget
  select: Partial<Record<keyof PluginConfig, boolean>>
  pluginName: string
}
export function populatePluginManifests({ data, select, permissionTarget, pluginName }: PopulateManifestsParams): Partial<PluginConfig> {
  const manifest = structuredClone(pluginsManifests[pluginName])

  const selected: Partial<PluginConfig> = {}
  for (const [scope] of objectEntries(select).filter(([_scope, bool]) => bool)) {
    if (!manifest?.[scope]) continue
    selected[scope] = manifest[scope].filter(item => item.permissions[permissionTarget].read || item.permissions[permissionTarget].write).map((item) => {
      const row = data[scope]?.find(candidate => candidate.pluginName === pluginName && candidate.key === item.key)
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
