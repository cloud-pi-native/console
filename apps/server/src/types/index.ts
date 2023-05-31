import { FastifyReply } from 'fastify/types/reply'
import { FastifyRequest } from 'fastify/types/request'

export type EnhancedFastifyRequest<Dto> = FastifyRequest & { session?: { user?: { id: string, firstName: string, lastName: string, email: string, groups: string[] } } } & Dto

// export type EnhancedFastifyReply<Dto> = FastifyReply<Dto>
