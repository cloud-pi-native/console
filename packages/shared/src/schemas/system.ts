import { z } from 'zod'

export const SystemSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
})
