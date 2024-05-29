import { z } from 'zod'

const configItemBase = z.object({
  key: z.string().min(2).regex(/[a-z-]/),
  description: z.string().optional(),
  title: z.string(),
})

const projectVisibilty = z.object({
  permissions: z.object({
    user: z.object({
      read: z.boolean(),
      write: z.boolean(),
    }),
    admin: z.object({
      read: z.boolean(),
      write: z.boolean(),
    }),
  }),
})

const globalVisibilty = z.object({
  permissions: z.object({
    user: z.object({
      read: z.boolean(),
      write: z.boolean().refine(value => !value, { message: 'global params can\'t be user writable' }),
    }),
    admin: z.object({
      read: z.boolean(),
      write: z.boolean(),
    }),
  }),
})

export const ENABLED = 'enabled'
export const DISABLED = 'disabled'
export const DEFAULT = 'default'

export const atomicValidators = {
  switch: z.enum([DISABLED, DEFAULT, ENABLED]),
  text: z.string().trim().regex(/[a-zA-Z-_0-9 ]*/),
}

export type SwitchParam = Zod.infer<typeof atomicValidators.switch>

const configItemSwitch = z.object({
  kind: z.literal('switch'),
  value: atomicValidators.switch,
  initialValue: atomicValidators.switch,
}).merge(configItemBase)

const configItemInput = z.object({
  kind: z.literal('text'),
  value: atomicValidators.text,
  placeholder: z.string().optional(),
}).merge(configItemBase)

const configGlobalItemDeclaration = z.discriminatedUnion('kind', [
  configItemSwitch.merge(globalVisibilty),
  configItemInput.merge(globalVisibilty),
])

export type PluginConfigItem = Zod.infer<typeof configGlobalItemDeclaration>

export const configProjectItemDeclaration = z.discriminatedUnion('kind', [
  configItemSwitch.merge(projectVisibilty),
  configItemInput.merge(projectVisibilty),
])

export const pluginConfig = z.object({
  global: configGlobalItemDeclaration.array(),
  project: configProjectItemDeclaration.array(),
})

export type PluginConfig = Zod.infer<typeof pluginConfig>

export const pluginsPopulatedManifests = pluginConfig.partial()
export type PluginsPopulatedManifests = Zod.infer<typeof pluginsPopulatedManifests>

export const pluginUpdateBody = z.record(z.record(z.string()))
export type PluginsUpdateBody = Zod.infer<typeof pluginUpdateBody>
