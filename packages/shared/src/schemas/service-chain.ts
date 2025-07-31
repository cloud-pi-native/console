import { z } from 'zod'

export const CleanedServiceChainSchema = z.object({
  id: z.string(),
  state: z.string(),
  success: z.boolean(),
  validation_id: z.string(),
  validated_by: z.string(),
  version: z.string(),
  pai: z.string(),
  ref: z.string(),
  location: z.string(),
  targetAddress: z.string().ip(),
  PAI: z.string(),
  projectId: z.string(),
  env: z.string(),
  network: z.string(),
  commonName: z.string(),
  subjectAlternativeName: z.array(z.string()),
  redirect: z.boolean(),
  antivirus: z.boolean(),
  maxFileSize: z.number(),
  websocket: z.boolean(),
  ipWhiteList: z.array(z.string()),
  sslOutgoing: z.boolean(),
  createat: z.string(),
  updateat: z.string(),
})

export const ServiceChainDetailsSchema = CleanedServiceChainSchema

export type ServiceChain = Zod.infer<typeof CleanedServiceChainSchema>
export type ServiceChainDetails = Zod.infer<typeof ServiceChainDetailsSchema>

export type CleanedServiceChain = Zod.infer<typeof CleanedServiceChainSchema>
