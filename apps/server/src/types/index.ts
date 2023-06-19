import { FastifyRequest } from 'fastify/types/request'

export type EnhancedFastifyRequest<Body> = FastifyRequest & { session?: { user?: { id?: string, groups: string[] } }, body?: Body }
