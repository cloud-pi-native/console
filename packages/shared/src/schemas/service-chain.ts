import { z } from 'zod'

export const serviceChainStateEnum = ['opened', 'pending', 'success', 'failed'] as const
export const ServiceChainStateZodEnum = z.enum(serviceChainStateEnum)
export type ServiceChainState = Zod.infer<typeof ServiceChainStateZodEnum>

export const serviceChainNetworkEnum = ['RIE', 'INTERNET'] as const
export const ServiceChainNetworkZodEnum = z.enum(serviceChainNetworkEnum)
export type ServiceChainNetwork = Zod.infer<typeof ServiceChainNetworkZodEnum>

export const serviceChainLocationEnum = ['SIR', 'SIL'] as const
export const ServiceChainLocationZodEnum = z.enum(serviceChainLocationEnum)
export type ServiceChainLocation = Zod.infer<typeof ServiceChainLocationZodEnum>

export const serviceChainEnvironmentEnum = ['INT', 'PROD'] as const
export const ServiceChainEnvironmentZodEnum = z.enum(serviceChainEnvironmentEnum)
export type ServiceChainEnvironment = Zod.infer<
  typeof ServiceChainEnvironmentZodEnum
>

export const ServiceChainSchema = z.object({
  id: z.string().uuid(),
  state: ServiceChainStateZodEnum,
  commonName:
    // @TODO: Replace with z.hostname when upgraded to Zod v4
    z.string(),
  pai: z.string(),
  network: ServiceChainNetworkZodEnum,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type ServiceChain = Zod.infer<typeof ServiceChainSchema>

export const ServiceChainListSchema = z.array(ServiceChainSchema)
export type ServiceChainList = Zod.infer<typeof ServiceChainListSchema>

export const ServiceChainDetailsSchema = ServiceChainSchema.extend({
  validationId: z.string().uuid(),
  validatedBy: z.string().uuid(),
  ref: z.nullable(z.string().uuid()),
  location: ServiceChainLocationZodEnum,
  targetAddress: z.string().ip(),
  projectId: z.string().uuid(),
  env: ServiceChainEnvironmentZodEnum,
  subjectAlternativeName: z.array(
    // @TODO: Replace with z.hostname when upgraded to Zod v4
    z.string(),
  ),
  redirect: z.boolean(),
  antivirus: z.nullable(z.object({
    maxFileSize: z.number(),
  })),
  websocket: z.boolean(),
  ipWhiteList: z.array(z.string().cidr()),
  sslOutgoing: z.boolean(),
})
export type ServiceChainDetails = Zod.infer<typeof ServiceChainDetailsSchema>
