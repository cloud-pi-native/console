import { FastifyRequest } from 'fastify/types/request'

export type EnhancedFastifyRequest<Dto> = FastifyRequest & { session?: { user?: { id?: string, groups: string[] } } } & Dto
