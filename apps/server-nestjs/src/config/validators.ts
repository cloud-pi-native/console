import { z } from 'zod'

// Localized zod-4 copies of the validators exported by @cpn-console/shared and
// @cpn-console/hooks. server-nestjs runs on zod 4 while those packages remain on
// zod 3; importing their ZodType values would cross the major boundary and break
// at runtime (.merge/.extend of a zod-3 schema into a zod-4 schema throws).
// These definitions mirror packages/shared/src/schemas/config.ts and
// packages/hooks/src/config.ts exactly, expressed with the local zod 4 instance.

export const ENABLED = 'enabled'
export const DISABLED = 'disabled'
export const DEFAULT = 'default'

export const atomicValidators = {
  switch: z.enum([DISABLED, DEFAULT, ENABLED]),
  // eslint-disable-next-line regexp/prefer-w, regexp/use-ignore-case
  text: z.string().trim().regex(/[a-zA-Z-_0-9 ]*/),
}

export type SwitchParam = z.infer<typeof atomicValidators.switch>

export type PluginConfig = z.infer<typeof pluginConfig>
export const pluginConfig = z.object({
  global: z.array(z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('switch'),
      value: atomicValidators.switch,
      initialValue: atomicValidators.switch,
      key: z.string().min(2).regex(/[a-z-]/),
      description: z.string().optional(),
      title: z.string(),
      section: z.string().optional(),
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
    }),
    z.object({
      kind: z.literal('text'),
      value: atomicValidators.text,
      placeholder: z.string().optional(),
      key: z.string().min(2).regex(/[a-z-]/),
      description: z.string().optional(),
      title: z.string(),
      section: z.string().optional(),
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
    }),
  ])),
  project: z.array(z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('switch'),
      value: atomicValidators.switch,
      initialValue: atomicValidators.switch,
      key: z.string().min(2).regex(/[a-z-]/),
      description: z.string().optional(),
      title: z.string(),
      section: z.string().optional(),
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
    }),
    z.object({
      kind: z.literal('text'),
      value: atomicValidators.text,
      placeholder: z.string().optional(),
      key: z.string().min(2).regex(/[a-z-]/),
      description: z.string().optional(),
      title: z.string(),
      section: z.string().optional(),
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
    }),
  ])),
})

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

  for (const item of arg.global ?? []) {
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
