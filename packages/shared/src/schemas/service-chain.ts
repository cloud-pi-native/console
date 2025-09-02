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

export const serviceChainEnvironmentEnum = ['INT', 'PROD', 'BAS'] as const
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
  validatedBy: z.nullable(z.string().uuid()),
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

// JSON as String validation through Zod. Instead of adding yet-another-dependency,
// I merely copied the code as-is.
// Many thanks to JacobWeisenburger/zod_utilz !
//
// Usage: use stringToJSON() as you would use z.string() to validate strings that must
// contain JSON stringified content
const literalSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])
type Literal = z.infer<typeof literalSchema>
type Json = Literal | { [ key: string ]: Json } | Json[]
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    literalSchema,
    z.array(jsonSchema),
    z.record(jsonSchema),
  ]),
)
export const json = () => jsonSchema

export const serviceChainFlowStateEnum = ['opened', 'pending', 'success', 'failed'] as const
export const ServiceChainFlowStateZodEnum = z.enum(serviceChainFlowStateEnum)
export type ServiceChainFlowState = Zod.infer<typeof ServiceChainFlowStateZodEnum>

export const ServiceChainFlowDetailsSchema = z.object({
  state: ServiceChainFlowStateZodEnum,
  input: json(),
  output: json(),
  updatedAt: z.coerce.date(),
})
export type ServiceChainFlowDetails = Zod.infer<typeof ServiceChainFlowDetailsSchema>

export const ServiceChainFlowsSchema = z.object({
  reserve_ip: ServiceChainFlowDetailsSchema,
  create_cert: z.nullable(ServiceChainFlowDetailsSchema),
  call_exec: ServiceChainFlowDetailsSchema,
  activate_ip: ServiceChainFlowDetailsSchema,
  dns_request: ServiceChainFlowDetailsSchema,
})
// Flows is on object, so always used in plural sense
export type ServiceChainFlows = Zod.infer<typeof ServiceChainFlowsSchema>
